// @flow
import React, { Component } from "react";
import { MenuItem } from "material-ui/Menu";
import Select from "material-ui/Select";
import type { Currency } from "@ledgerhq/live-common/lib/types";

class CurrencySelect extends Component<{
  value: ?Currency,
  currencies: Currency[],
  onChange: (?Currency) => void
}> {
  handleChange = (e: *) => {
    this.props.onChange(this.props.currencies[e.target.value]);
  };
  render() {
    const { currencies, value } = this.props;
    const i = currencies.indexOf(value);
    return (
      <Select value={i} onChange={this.handleChange}>
        <MenuItem value={-1}>
          <em>None</em>
        </MenuItem>
        {currencies.map((c, i) => (
          <MenuItem key={i} value={i}>
            {c.name} ({c.ticker})
          </MenuItem>
        ))}
      </Select>
    );
  }
}

export default CurrencySelect;
