// @flow
import React, { Component } from "react";
import MenuItem from "@material-ui/core/MenuItem";
import Select from "@material-ui/core/Select";
import type { Currency } from "@ledgerhq/live-common/lib/types";
import type { Exchange } from "@ledgerhq/live-common/lib/countervalues/types";
import { getCountervalues } from "@ledgerhq/live-common/lib/countervalues";

class ExchangeSelect extends Component<
  {
    from: Currency,
    to: Currency,
    value: ?string,
    onChange: (?Currency) => void
  },
  {
    prevFromTo: string,
    exchanges: ?(Exchange[]),
    error: ?Error
  }
> {
  state = {
    prevFromTo: "",
    exchanges: null,
    error: null
  };

  static getDerivedStateFromProps(nextProps: *, prevState: *) {
    const fromTo = nextProps.from.ticker + "/" + nextProps.to.ticker;
    if (fromTo !== prevState.prevFromTo) {
      return {
        prevFromTo: fromTo,
        exchanges: null
      };
    }
    return null;
  }

  componentDidMount() {
    this._load();
  }

  componentDidUpdate() {
    if (this.state.exchanges === null) {
      this._load();
    }
  }

  _loadId = 0;
  async _load() {
    this._loadId++;
    this.setState({ exchanges: [] });
    const { _loadId } = this;
    const { from, to } = this.props;
    try {
      const exchanges = await getCountervalues().fetchExchangesForPair(
        from,
        to
      );
      if (this._loadId === _loadId) {
        this.setState({ exchanges });
      }
    } catch (error) {
      console.error(error);
      if (this._loadId === _loadId) {
        this.setState({ error });
      }
    }
  }

  handleChange = (e: *) => {
    this.props.onChange(e.target.value || null);
  };

  render() {
    const { value } = this.props;
    const { exchanges, error } = this.state;
    return exchanges ? (
      <Select value={value || ""} onChange={this.handleChange}>
        <MenuItem value={value || ""}>
          <em>{value || ""}</em>
        </MenuItem>
        {exchanges.map(e => (
          <MenuItem key={e.id} value={e.id}>
            {e.name}
          </MenuItem>
        ))}
      </Select>
    ) : error ? (
      "Failed to load."
    ) : (
      "Loading..."
    );
  }
}

export default ExchangeSelect;
