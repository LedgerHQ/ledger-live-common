// @flow

import React, { useEffect, useReducer, useCallback } from "react";
import { StyleSheet, Text, View, FlatList, SafeAreaView } from "react-native";
import { initialState, reducer, runTests } from "./runner";
import type { Node } from "./runner";

const Header = () => <Text style={styles.title}>Ledger Live Common Tests</Text>;

const bgColors = {
  pending: "#eee",
  running: "#ccc",
  failure: "#faa",
  success: "#0f0"
};

const ViewNode = ({ node }: { node: Node }) => {
  return (
    <View
      style={{
        flexDirection: "column",
        padding: 5,
        backgroundColor: bgColors[node.status]
      }}
    >
      <Text style={{ fontWeight: "bold" }}>{node.name}</Text>
      <Text>{node.status}</Text>
      <Text style={{ color: "#c22" }}>
        {node.error ? String(node.error) : null}
      </Text>
      {node.children.length === 0 ? null : (
        <View
          style={{
            flexDirection: "column",
            borderLeftColor: "#eee",
            borderLeftWidth: 1,
            paddingLeft: 5
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

  const renderItem = useCallback(({ item }) => <ViewNode node={item} />);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <FlatList
        style={styles.container}
        data={state.tree}
        ListHeaderComponent={Header}
        renderItem={renderItem}
        keyExtractor={t => t.name}
      />
    </SafeAreaView>
  );
};

export default App;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff"
  },
  title: {
    fontSize: 20,
    textAlign: "center",
    margin: 10
  }
});
