import { createElement, commitWork, performUnitOfWork } from "./utils";
let nextUnitOfWork,
  currentRoot,
  wipRoot,
  wipFiber,
  hookIndex = null;
function resetWipFiber(fiber) {
  wipFiber = fiber;
  hookIndex = 0;
  wipFiber.hooks = [];
}
function scheduleRerender() {
  nextUnitOfWork = wipRoot = {
    dom: currentRoot.dom,
    props: currentRoot.props,
    alternate: currentRoot
  };
}
export const React = { createElement, useState, createRoot };

function createRoot(container) {
  return {
    render(element) {
      wipRoot = {
        // type: 'n/a', // a string or function
        dom: container,
        props: {
          children: [element]
        }
        // // links
        // alternate - pending fiber
        // child - link to first child
        // parent - link to parent
        // sibling - link to next sibling
      };
      nextUnitOfWork = wipRoot;
    }
  };
}
// https://developer.mozilla.org/en-US/docs/Web/API/IdleDeadline#methods
function workLoop(deadline) {
  // render phase
  let shouldYield = false;
  let suspendedWork = null;
  while (!shouldYield && nextUnitOfWork) {
    try {
      nextUnitOfWork = performUnitOfWork(nextUnitOfWork, resetWipFiber);
    } catch (err) {
      if (err instanceof Promise) {
        suspendedWork = nextUnitOfWork;
        nextUnitOfWork = null;
        // eslint-disable-next-line
        err.then(() => {
          nextUnitOfWork = suspendedWork;
          wipRoot = currentRoot;
          // scheduleRerender();
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
    currentRoot = wipRoot;
    wipRoot = null;
  }
  requestIdleCallback(workLoop);
}
requestIdleCallback(workLoop);

function useState(initial) {
  const NONE = Symbol("__NONE__");
  const oldHook = wipFiber?.alternate?.hooks[hookIndex++];
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
  wipFiber.hooks.push(hook);
  return [hook.state, setState];
}
