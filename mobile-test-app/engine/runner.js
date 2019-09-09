// @flow

import React from "react";

const Header = () => <Text style={styles.title}>Ledger Live Common Tests</Text>;

export type Node = {
  name: string,
  status: "pending" | "running" | "failure" | "success",
  error: ?Error,
  children: Node[]
};

export type State = {
  tree: Node[],
  running: boolean
};

export const initialState: State = { tree: [], running: false };

const makeTree = nodes =>
  nodes.map(node => {
    return {
      name: node.name,
      status: "pending",
      error: null,
      children: makeTree(node.children)
    };
  });

const updatePath = (nodes, path, updater) => {
  if (path.length < 1) throw new Error("invalid path");
  const i = path[0];
  const node = nodes[i];
  if (!node) throw new Error("no node found in path");
  const newNodes = nodes.slice(0);
  if (path.length === 1) {
    newNodes[i] = updater(node);
  } else {
    newNodes[i] = {
      ...node,
      children: updatePath(node.children, path.slice(1), updater)
    };
  }
  return newNodes;
};

export const reducer = (state: State, action): State => {
  console.log(state, action);
  switch (action.type) {
    case "run-enter":
      return {
        ...state,
        tree: updatePath(state.tree, action.path, n => ({
          ...n,
          status: "running"
        }))
      };
    case "run-success":
      return {
        ...state,
        tree: updatePath(state.tree, action.path, n => ({
          ...n,
          status: "success"
        }))
      };
    case "run-failure":
      return {
        ...state,
        tree: updatePath(state.tree, action.path, n => ({
          ...n,
          status: "failure",
          error: action.error
        }))
      };
      return state;
    case "begin":
      return { tree: makeTree(action.testFiles), running: true };
    case "finish":
      return { ...state, running: false };
  }
  return state;
};

export const runTests = (testFiles, dispatch) => {
  async function rec(nodes, rootPath) {
    for (let i = 0; i < nodes.length; i++) {
      const path = rootPath.concat([i]);
      dispatch({ type: "run-start", path });
      try {
        const { tests, children, beforeAll, testFunction } = nodes[i];
        for (let j = 0; j < beforeAll.length; j++) {
          await beforeAll();
        }
        if (testFunction) {
          await testFunction();
        }
        /*
        for (let j = 0; j < tests.length; j++) {
          const testPath = path.concat([j]);
          dispatch({ type: "run-start", path: testPath });
          try {
            const { f } = tests[j];
            for (let j = 0; j < beforeEach.length; j++) {
              await beforeEach();
            }
            await f();
            dispatch({ type: "run-success", path: testPath });
          } catch (error) {
            dispatch({ type: "run-failure", path: testPath, error });
          }
        }
        */

        await rec(children, path);
        dispatch({ type: "run-success", path });
      } catch (error) {
        dispatch({ type: "run-failure", path, error });
      }
    }
  }
  return rec(testFiles, []);
};
