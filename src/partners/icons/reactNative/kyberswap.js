//@flow
import React from "react";
import Svg, { G, Path } from "react-native-svg";

type Props = {
  width: number
};

const Kyberswap = ({ width = 150 }: Props) => (
  <Svg viewBox="0 0 800 329" width={width} height={(width / 800) * 329}>
    <G fill="none" fillRule="evenodd">
      <G fill="#141927">
        <Path
          d="M99.9 325.1c-11.3-7.4-95.6-73.1-97.6-76L0 245.7v-81.6c0-78.6.1-81.7 1.9-84.7C3.6 76.6 96.8 4.3 102.7 1.2c3-1.7 11.9-1.5 15.1.3 1.5.8 24.3 18 50.7 38.2 36.2 27.8 48.4 37.7 49.7 40.3 1.7 3.2 1.8 9.4 1.8 84s-.1 80.8-1.8 84c-1.3 2.6-13.1 12.2-47.7 38.8-25.3 19.4-48 36.6-50.4 38.2-6.2 4.2-13.8 4.2-20.2.1zm58.5-46.3c26.7-20.4 43.1-33.5 42.3-33.9-.7-.4-27-15.6-58.6-33.8-31.6-18.2-57.6-32.9-57.8-32.7-.2.2 6 30.6 13.9 67.5 10.3 48.2 14.6 67 15.5 66.6.7-.2 20.8-15.4 44.7-33.7zm-76.3-45l-15-69.8 15-69.7C90.3 55.9 96.9 24 96.8 23.4c-.2-.6-19.1 13.3-42 30.9L13 86.3v155.5l41.8 31.9c22.9 17.6 41.8 31.5 42 30.9.1-.6-6.5-32.5-14.7-70.8zm124.7-104.1l-.3-34.2-59.2 34c-32.6 18.7-59.2 34.2-59.2 34.5-.1.3 26.6 15.8 59.2 34.5l59.2 34 .3-34.2c.1-18.9.1-49.7 0-68.6zm-63-13.7c31.9-18.4 58-33.5 57.9-33.6-4.1-4-88.2-67.2-88.7-66.7-.6.7-29 131.5-29 133.6 0 1.2-4 3.4 59.8-33.3z"
          fillRule="nonzero"
        />
        <Path d="M360.3 220.3c-2-.4-2.3-1.1-2.3-5.4V210h4.8c5.7 0 8.5-1.8 11.1-6.9l1.9-3.7-8.8-21.3c-4.9-11.7-9.2-22.1-9.5-23.2-.6-1.7-.1-1.9 5.4-1.9h6l5.1 13.3c2.9 7.2 5.8 14.8 6.7 16.7l1.4 3.5 6.8-16.5 6.8-16.5 6.1-.3c6.1-.3 6.2-.3 5.3 2-1.8 4.8-22.2 51.1-24 54.6-4.5 8.8-12.5 12.5-22.8 10.5z" />
        <Path
          d="M749 186.5V153h5.5c5.2 0 5.5.1 5.5 2.6v2.5l3.7-2.8c3.3-2.6 4.4-2.8 12.4-2.8 8.1 0 9 .2 13 3 6.5 4.6 10.1 11 10.7 19.3.8 12.2-4.4 21.8-14.2 26.3-7.3 3.3-18.5 2-23.8-2.8-1.7-1.5-1.8-1.1-1.8 10V220h-11v-33.5zm33 3.5c4-2.8 6.2-7.4 6.2-13.2-.1-5.8-1.9-8.9-7.2-12.5-10.5-7.2-23.6 4.3-20 17.6 2.5 9.3 13.3 13.5 21 8.1zM433 201.4c-1.9-.8-4.5-2.5-5.7-3.6l-2.3-2.1v3.1c0 3.2-.1 3.2-5 3.2h-5v-75h11v15c0 8.3.2 15 .5 15s2-1 3.6-2.2c2.6-2 4.3-2.3 11.7-2.3 7.8 0 9.1.3 12.8 2.8 5.2 3.5 7.9 7.2 10 13.6 3.3 10.2.4 21.2-7.5 28.4-6.2 5.6-16.5 7.4-24.1 4.1zm14.5-11.3c3.8-2.1 6.5-7.4 6.5-12.9 0-10.3-9-17.3-18.4-14.2-7.7 2.5-11.4 11.9-8.2 20.5 2 5 3.2 6.2 8.3 8 4.2 1.5 7.3 1.1 11.8-1.4zM491 202.1c-7.5-2.4-13.8-8-16.5-14.5-.9-2.1-1.6-6.6-1.6-10.1 0-15.2 10.1-25.5 25-25.5 8.1 0 14.2 2.7 18.1 8.2 3.3 4.4 5.5 13.3 4.5 17.8l-.7 3h-35.7l1.1 3c2.4 7 12.2 10.6 20.2 7.6 2.5-.9 5-2.4 5.6-3.2 1.8-2.1 2.5-1.8 5.3 2.5l2.6 3.9-2.2 2c-4.1 3.7-9.1 5.5-16.2 5.8-3.8.2-8.1 0-9.5-.5zm18-32.2c0-2.7-5.1-7.5-8.8-8.2-4.4-.9-9.8 1-12.6 4.4-4.6 5.5-4 5.9 9.4 5.9 11.5 0 12-.1 12-2.1z"
          fillRule="nonzero"
        />
        <Path d="M576.7 201.4c-5-1.6-14.7-9.8-14.7-12.5 0-.8 1.7-2.6 3.8-4l3.7-2.6 4.3 4.3c6.7 6.7 14.6 8 20.7 3.3 3.3-2.7 3.4-7.7.3-10.6-1.3-1.2-6.6-4.2-11.8-6.8-13.9-6.9-17.2-10.7-17.2-19.5 0-19 27.5-24.9 40.3-8.6 2.4 3 2.4 2.8-3.9 7.3-2.2 1.5-2.4 1.5-5.6-1.6-5.5-5.3-13-6.2-17.5-1.9-2.3 2.1-2.7 4.9-1 8 .6 1.1 5 3.8 9.7 6.1 12.2 5.6 17.1 9.2 19.3 14.1 2.5 5.5 2.4 10.2-.3 15.6-4.8 9.5-17.2 13.4-30.1 9.4zM632.1 200.8c-.5-1.3-5.2-12.2-10.5-24.2-5.3-12.1-9.6-22.4-9.6-22.8 0-.4 2.6-.8 5.9-.8h5.8l5.9 14.5c3.2 8 6 14.5 6.3 14.5.4 0 3.5-6.7 7.1-14.8 5.8-12.8 6.9-14.7 9.1-15 2.3-.3 3 .8 9.3 14.7 3.8 8.3 7.2 14.8 7.6 14.6.4-.2 3.1-6.7 6.1-14.4l5.4-14.1h12.4l-2.7 6.3c-1.5 3.4-6.3 14.6-10.7 24.9-10.4 24.4-10 24.3-19.7 3.8-3.9-8.2-7.4-15-7.8-15-.3 0-3.7 6.8-7.5 15-6 13.1-7.2 15-9.2 15-1.5 0-2.7-.8-3.2-2.2z" />
        <Path
          d="M702.5 201.1c-5.5-2.5-7.9-6.3-7.9-12.8 0-4.2.5-5.7 2.4-7.9 4.3-4.5 7.8-5.7 18.8-6.2 7.9-.4 10.2-.8 10.2-1.9 0-2.8-2.9-8.2-5.1-9.3-3.6-2-10.5-.6-14.9 2.9l-4 3.2-3-3.3c-1.6-1.8-3-3.6-3-4 0-1.5 8.3-7.6 11.9-8.6 4.8-1.5 14.1-1.5 17.8-.1 4 1.5 7.3 4.8 9.4 9.4 1.6 3.4 1.9 6.6 1.9 21.8V202h-5.5c-4.7 0-5.5-.3-5.5-1.9 0-1.7-.3-1.7-4.7.5-5.7 2.9-13.1 3.1-18.8.5zm19.5-10.7c1.5-1.6 3.1-3.9 3.5-5.1.6-2.2.5-2.3-7.2-2.3-8.8 0-12.3 1.6-12.3 5.5 0 6.1 10.7 7.3 16 1.9z"
          fillRule="nonzero"
        />
        <Path d="M304 169v-33h11.9l.3 14.5.3 14.5 12.9-14.5 12.9-14.5h6.8c3.8 0 6.9.2 6.9.5 0 .4-5.8 7.1-13 15.2-7.1 8-13 14.8-13 15.2 0 .4 6.5 8.3 14.5 17.5s14.5 16.9 14.5 17.2c0 .2-3.1.4-6.9.4h-6.9l-14.4-16.5-14.3-16.5-.3 16.5-.2 16.5h-12v-33zM530 177.5V153h5.5c4.9 0 5.5.2 5.5 2.1v2.1l3.6-2.2c2.3-1.5 5.3-2.3 8.7-2.4l5.2-.1.3 5.3.3 5.2h-3.6c-5 0-9.7 2.2-12 5.6-1.7 2.5-2 5.1-2.3 18.2l-.4 15.2H530v-24.5z" />
      </G>
      <Path
        d="M99.9 325.1c-11.3-7.4-95.6-73.1-97.6-76L0 245.7v-81.6c0-78.6.1-81.7 1.9-84.7C3.6 76.6 96.8 4.3 102.7 1.2c3-1.7 11.9-1.5 15.1.3 1.5.8 24.3 18 50.7 38.2 36.2 27.8 48.4 37.7 49.7 40.3 1.7 3.2 1.8 9.4 1.8 84s-.1 80.8-1.8 84c-1.3 2.6-13.1 12.2-47.7 38.8-25.3 19.4-48 36.6-50.4 38.2-6.2 4.2-13.8 4.2-20.2.1zm58.5-46.3c26.7-20.4 43.1-33.5 42.3-33.9-.7-.4-27-15.6-58.6-33.8-31.6-18.2-57.6-32.9-57.8-32.7-.2.2 6 30.6 13.9 67.5 10.3 48.2 14.6 67 15.5 66.6.7-.2 20.8-15.4 44.7-33.7zm-76.3-45l-15-69.8 15-69.7C90.3 55.9 96.9 24 96.8 23.4c-.2-.6-19.1 13.3-42 30.9L13 86.3v155.5l41.8 31.9c22.9 17.6 41.8 31.5 42 30.9.1-.6-6.5-32.5-14.7-70.8zm124.7-104.1l-.3-34.2-59.2 34c-32.6 18.7-59.2 34.2-59.2 34.5-.1.3 26.6 15.8 59.2 34.5l59.2 34 .3-34.2c.1-18.9.1-49.7 0-68.6zm-63-13.7c31.9-18.4 58-33.5 57.9-33.6-4.1-4-88.2-67.2-88.7-66.7-.6.7-29 131.5-29 133.6 0 1.2-4 3.4 59.8-33.3z"
        fill="#EF8102"
        fillRule="nonzero"
      />
    </G>
  </Svg>
);
export default Kyberswap;
