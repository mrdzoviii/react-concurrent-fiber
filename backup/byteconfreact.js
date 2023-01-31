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

// fiber
function createRoot(_container) {
  return {
    render(el) {
      wipRoot = {
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

function workLoop(deadline) {
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
      }
    }
    shouldYield = deadline.timeRemaining() < 1;
  }
  if (!nextUnitOfWork && wipRoot) {
    commitWork(wipRoot.child);
    currentRoot = wipRoot;
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
  const setState = newState => {
    hook.pendingState = newState;
    scheduleRerender();
  };
  wipRoot.hooks.push(hook);
  return [hook.state, setState];
}
