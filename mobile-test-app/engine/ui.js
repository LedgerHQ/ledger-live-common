// @flow

import React, { useEffect, useState, useReducer, useCallback } from "react";
import {
  Text,
  View,
  FlatList,
  SafeAreaView,
  TouchableOpacity
} from "react-native";
import { initialState, reducer, runTests } from "./runner";
import type { Node } from "./runner";

const colors = {
  success: "#0C0",
  done: "#bbb",
  failure: "#C00",
  pending: "#888",
  running: "#333"
};

const allStatuses = node => {
  if (node.children.length === 0) return [node.status];
  return node.children.map(allStatuses).flat();
};

const groupStatus = node => {
  const all = allStatuses(node);
  if (all.includes("pending")) return "pending";
  if (all.includes("failure")) return "failure";
  return all[0];
};

const generalStatus = nodes => groupStatus({ children: nodes });

const ViewNode = ({ node, topLevel }: { node: Node, topLevel: boolean }) => {
  const [collapsed, setCollapsed] = useState(false);

  const status = groupStatus(node);

  useEffect(() => {
    if (!collapsed && status === "success") {
      setCollapsed(true);
    }
  }, [status]);

  return (
    <View
      style={{
        flexDirection: "column",
        padding: 5
      }}
    >
      <TouchableOpacity
        onPress={() => {
          setCollapsed(!collapsed);
        }}
      >
        <Text
          style={{
            fontWeight: "bold",
            color: colors[status]
          }}
        >
          {node.name}
        </Text>
      </TouchableOpacity>
      <Text style={{ color: "#c22" }}>
        {node.error ? String(node.error) : null}
      </Text>
      {node.children.length === 0 ? null : (
        <View
          style={{
            flexDirection: "column",
            paddingLeft: 5,
            display: collapsed ? "none" : "flex"
          }}
        >
          {node.children.map((node, i) => (
            <ViewNode node={node} key={i} />
          ))}
        </View>
      )}
    </View>
  );
};

const App = ({ testFiles }: *) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  useEffect(() => {
    dispatch({ type: "begin", testFiles });
    runTests(testFiles, dispatch)
      .catch(error => {
        dispatch({ type: "error", error });
      })
      .then(result => {
        dispatch({ type: "finish", result });
      });
  }, [testFiles, dispatch]);

  const renderItem = useCallback(({ item }) => (
    <ViewNode topLevel node={item} />
  ));

  const status = generalStatus(state.tree) || "pending";

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <FlatList
        style={{ flex: 1 }}
        data={state.tree}
        ListHeaderComponent={
          <View
            style={{
              padding: 20,
              alignItems: "center",
              backgroundColor: colors[status]
            }}
          >
            <Text>{status}</Text>
          </View>
        }
        renderItem={renderItem}
        keyExtractor={t => t.name}
      />
    </SafeAreaView>
  );
};

export default App;
