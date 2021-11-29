import { ChainAPI } from "./chain";

export function logged(api: ChainAPI): ChainAPI {
  const proxy: ChainAPI = new Proxy(api, {
    get(target, propKey, receiver) {
      const targetValue = Reflect.get(target, propKey, receiver);
      if (typeof targetValue === "function") {
        return function (...args: unknown[]) {
          const result = targetValue.apply(this, args);
          const log = (_: unknown) => {};
          /*
          const log = (answer: unknown) => {
            console.log({
              method: propKey,
              params: args,
              answer,
            });
          };
          */
          if (result instanceof Promise) {
            return result.then((answer) => {
              log(answer);
              return answer;
            });
          } else {
            log(result);
            return result;
          }
        };
      } else {
        return targetValue;
      }
    },
  });

  return proxy;
}
