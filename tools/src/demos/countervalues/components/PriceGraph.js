// @flow
import React, { Component } from "react";
import { BigNumber } from "bignumber.js";
import { connect } from "react-redux";
import { VictoryLine } from "victory";
import { getCountervalues } from "@ledgerhq/live-common/lib/countervalues";
import type { Currency } from "@ledgerhq/live-common/lib/types";

const DAY = 24 * 60 * 60 * 1000;
const mapStateToProps = (state, props: *) => {
  const data = [];
  let t = Date.now() - props.days * DAY;
  const value = BigNumber(10 ** props.from.units[0].magnitude);
  for (let i = 0; i < props.days; i++) {
    const date = new Date(t);
    const cv = getCountervalues().calculateSelector(state, {
      ...props,
      date,
      value
    });
    data.push({
      date,
      value: cv ? cv.toNumber() : 0
    });
    t += DAY;
  }
  return { data };
};

class PriceGraph extends Component<{
  from: Currency,
  to: Currency,
  days: number,
  exchange: string,
  data: Array<{ date: Date, value: number }>,
  width: number,
  height: number
}> {
  render() {
    const { width, height, data } = this.props;
    return (
      <svg height={height} width={width}>
        <VictoryLine
          standalone={false}
          width={width}
          height={height}
          scale={{ x: "time" }}
          x="date"
          y="value"
          data={data}
          padding={5}
          style={{
            data: {
              stroke: "#333",
              strokeWidth: 1
            }
          }}
        />
      </svg>
    );
  }
}

export default connect(mapStateToProps)(PriceGraph);
