// dogAPI.js
export function createResource() {
  return wrapPromise(fetchDogs);
}

function fetchDogs(numDogs) {
  console.log("numdogs", numDogs);
  console.log(`fetch ${numDogs} dogs...`);
  return fetch("https://swyx.builtwithdark.com/randomDog?count=" + numDogs)
    .then(x => x.json())
    .then(y => y.map(x => x.toLowerCase()));
}

function wrapPromise(promise) {
  let status = "pending";
  let result;
  let currentArg = null;
  let suspender = arg =>
    promise(arg).then(
      r => {
        status = "success";
        result = r;
      },
      e => {
        status = "error";
        result = e;
      }
    );
  return {
    read(arg) {
      if (currentArg !== arg) {
        status = "pending";
        currentArg = arg;
      }
      if (status === "pending") {
        throw suspender(arg);
      } else if (status === "error") {
        throw result;
      } else if (status === "success") {
        return result;
      }
    }
  };
}
