// @flow
import React, { Component } from "react";
import type BigNumber from "bignumber.js";
import { connect } from "react-redux";
import { createStructuredSelector } from "reselect";
import { getCountervalues } from "@ledgerhq/live-common/lib/countervalues";
import { formatCurrencyUnit } from "@ledgerhq/live-common/lib/currencies";
import type { Currency } from "@ledgerhq/live-common/lib/types";

const mapStateToProps = createStructuredSelector({
  countervalue: getCountervalues().calculateSelector
});

class Price extends Component<{
  from: Currency,
  to: Currency,
  exchange: string,
  value: BigNumber,
  countervalue: ?BigNumber,
  date?: Date
}> {
  render() {
    const { from, to, value, countervalue } = this.props;
    if (!countervalue) return null;
    return (
      <span>
        <strong>
          {formatCurrencyUnit(from.units[0], value, { showCode: true })}
        </strong>
        {" = "}
        <strong>
          {formatCurrencyUnit(to.units[0], countervalue, { showCode: true })}
        </strong>
      </span>
    );
  }
}

export default connect(mapStateToProps)(Price);
