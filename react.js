import {
  reconcileChildren,
  createElement,
  commitDeletion,
  createDom,
  updateDom
  // render
} from "./utils";
let nextUnitOfWork = null;
let currentRoot = null;
let wipRoot = null;
let deletions = [];
let wipFiber = null;
let hookIndex = null;
export default { createElement, useState, createRoot };

function createRoot(container) {
  return function(element) {
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
  };
}
// https://developer.mozilla.org/en-US/docs/Web/API/IdleDeadline#methods
function workLoop(deadline) {
  // render phase
  let shouldYield = false;
  let suspendedWork = null;
  while (!shouldYield && nextUnitOfWork) {
    try {
      nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
    } catch (err) {
      if (err instanceof Promise) {
        suspendedWork = nextUnitOfWork;
        nextUnitOfWork = null;
        err.then(() => {
          nextUnitOfWork = suspendedWork;
          wipRoot = currentRoot;
        });
      } else {
        throw err;
      }
    }
    shouldYield = deadline.timeRemaining() < 1;
  }
  // commit phase
  if (!nextUnitOfWork && wipRoot) {
    // commitRoot
    deletions.forEach(commitWork);
    commitWork(wipRoot.child);
    currentRoot = wipRoot;
    wipRoot = null;
  }
  requestIdleCallback(workLoop);
}
requestIdleCallback(workLoop);

function performUnitOfWork(fiber) {
  const isFunctionComponent = fiber.type instanceof Function;
  if (isFunctionComponent) {
    // it is either a function component... (so call it)
    wipFiber = fiber;
    hookIndex = 0;
    wipFiber.hooks = [];
    const children = [fiber.type(fiber.props)];
    reconcileChildren(fiber, children.flat());
  } else {
    // or a host component... (so createDom)
    if (!fiber.dom) fiber.dom = createDom(fiber);
    reconcileChildren(fiber, fiber.props.children.flat());
  }
  if (fiber.child) return fiber.child;
  let nextFiber = fiber;
  while (nextFiber) {
    if (nextFiber.sibling) return nextFiber.sibling;
    nextFiber = nextFiber.parent;
  }
}
function commitWork(fiber) {
  if (!fiber) return;
  let domParentFiber = fiber.parent;
  while (!domParentFiber.dom) {
    domParentFiber = domParentFiber.parent;
  }
  const domParent = domParentFiber.dom;
  if (fiber.effectTag === "PLACEMENT" && fiber.dom != null) {
    domParent.appendChild(fiber.dom);
  } else if (fiber.effectTag === "UPDATE" && fiber.dom != null) {
    updateDom(fiber.dom, fiber.alternate.props, fiber.props);
  } else if (fiber.effectTag === "DELETION") {
    commitDeletion(fiber, domParent);
  }
  commitWork(fiber.child);
  commitWork(fiber.sibling);
}

function useState(initial) {
  const oldHook = wipFiber?.alternate?.hooks[hookIndex];
  const nothing = Symbol("__NONE__");
  const hook = {
    state: oldHook ? oldHook.state : initial,
    pendingState: nothing
  };
  if (oldHook && oldHook.pendingState !== nothing) {
    hook.state = oldHook.pendingState;
  }
  const setState = newState => {
    hook.pendingState = newState;
    wipRoot = {
      dom: currentRoot.dom,
      props: currentRoot.props,
      alternate: currentRoot
    };
    nextUnitOfWork = wipRoot;
    deletions = [];
  };
  wipFiber.hooks.push(hook);
  hookIndex++;
  return [hook.state, setState];
}
