import React from "react";
import { Box, render } from "ink";

const args = [];

export default {
  description: "Clear the current  display",
  args,
  job: () => {
    render(<Box />);
  },
};
