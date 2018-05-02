import "babel-polyfill";
import React from "react";
import ReactDOM from "react-dom";
import { Provider } from "react-redux";
import "./index.css";
import registerServiceWorker from "./registerServiceWorker";
import { initStore } from "./store";
import App from "./components/App";
import CounterValues from "./countervalues";

const store = initStore();

ReactDOM.render(
  <Provider store={store}>
    <CounterValues.PollingProvider>
      <App />
    </CounterValues.PollingProvider>
  </Provider>,
  document.getElementById("root")
);
registerServiceWorker();
