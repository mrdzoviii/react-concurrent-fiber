import { createElement, performUnitOfWork, commitWork } from "./utils";
export const React = { createElement, createRoot, useState };
let wipRoot,
  currentRoot,
  nextUnitOfWork = null;
let hookIndex = 0;

function scheduleRerender() {
  nextUnitOfWork = wipRoot = {
    dom: currentRoot.dom,
    props: currentRoot.props,
    alternate: currentRoot,
    hooks: []
  };
}

function createRoot(_container) {
  return {
    render(el) {
      wipRoot = {
        // type: 'n/a', // a string or function
        dom: _container,
        props: {
          children: [el]
        },
        hooks: [],
        alternate: {
          hooks: []
        }
      };
      nextUnitOfWork = wipRoot;
    }
  };
}

// https://developer.mozilla.org/en-US/docs/Web/API/IdleDeadline#methods
function workLoop(deadline) {
  // render phase
  let shouldYield = false;
  while (!shouldYield && nextUnitOfWork) {
    try {
      nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
    } catch (err) {
      if (err instanceof Promise) {
        nextUnitOfWork = null;
        // eslint-disable-next-line
        err.then(() => {
          wipRoot = currentRoot;
          wipRoot.hooks = [];
          nextUnitOfWork = wipRoot;
        });
      } else {
        throw err;
      }
    }
    shouldYield = deadline.timeRemaining() < 1;
  }
  // commit phase
  if (!nextUnitOfWork && wipRoot) {
    // commitRoot;
    commitWork(wipRoot.child);
    currentRoot = wipRoot; // <- new
    wipRoot = null;
    hookIndex = 0;
  }
  requestIdleCallback(workLoop);
}
requestIdleCallback(workLoop);

const NONE = Symbol("__NONE__");
function useState(initial) {
  const oldHook = wipRoot?.alternate?.hooks[hookIndex++];
  const hasPendingState = oldHook && oldHook.pendingState !== NONE;
  const oldState = oldHook ? oldHook.state : initial;
  const hook = {
    state: hasPendingState ? oldHook?.pendingState : oldState,
    pendingState: NONE
  };
  // console.log("usestate", { wipRoot });
  const setState = newState => {
    hook.pendingState = newState;
    console.log({ wipRoot, newState });
    scheduleRerender();
  };
  wipRoot.hooks.push(hook);
  // console.log("wipRoot", wipRoot.hooks);
  return [hook.state, setState];
}
