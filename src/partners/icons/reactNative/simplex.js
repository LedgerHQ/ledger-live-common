// @flow

import Svg, { Path } from "react-native-svg";
import React from "react";

const SimpleX = ({ width = 160 }: { width?: number }) => (
  <Svg width={width} height={(width * 57) / 160}>
    <Path
      fill="#75787B"
      d="M58.227 22.684c.971.451 1.969.558 3.587.584 4.234.08 5.771 1.087 5.771 3.528a3.62 3.62 0 0 1-.377 1.644c-.243.477-.756.981-1.484 1.485-.728.504-1.995.743-3.802.743-2.562 0-4.45-.61-5.718-1.857a.89.89 0 0 1-.242-.53c.027-.451.242-.664.647-.664.216 0 .378.054.512.187.944 1.034 2.644 1.617 4.72 1.617 2.805 0 4.369-.955 4.369-2.652.027-.77-.216-1.273-.728-1.538-.998-.53-2.077-.664-3.803-.69-4.1-.08-5.501-.981-5.501-3.236 0-2.387 2.184-3.899 5.555-3.899 2.077 0 3.776.583 5.043 1.671a.69.69 0 0 1 .216.53c-.027.398-.243.637-.62.664-.216 0-.405-.053-.54-.186-.97-.928-2.4-1.406-4.018-1.406-.647 0-1.24.053-1.753.186a6.21 6.21 0 0 0-1.645.716c-.566.345-.836.902-.863 1.724-.027.69.216 1.14.674 1.38m39.721.397v6.684c0 .478-.216.716-.674.743-.459-.027-.702-.265-.702-.743v-6.551c0-2.97-1.267-4.536-3.721-4.536-2.481 0-4.073 1.936-4.073 5.04v6.047c0 .478-.215.716-.674.743-.458-.027-.701-.265-.701-.743v-6.551c0-2.97-1.267-4.536-3.721-4.536-2.508 0-4.073 1.936-4.073 5.04v6.047c0 .478-.242.716-.7.743-.432-.027-.648-.265-.675-.743V18.334c.027-.504.243-.742.674-.769.459.027.701.265.701.77v1.379h.054c.863-1.486 2.347-2.308 4.261-2.308 2.158 0 3.614.955 4.342 2.732h.054c.863-1.698 2.427-2.732 4.72-2.732 3.263 0 4.908 1.99 4.908 5.676m17.036.955c0-3.183-2.13-5.358-5.312-5.358-3.156 0-5.367 2.175-5.367 5.358s2.211 5.358 5.367 5.358c3.182 0 5.312-2.175 5.312-5.358m-10.68-5.702v1.83h.055c.27-.451.593-.823.944-1.167.377-.345.917-.69 1.618-1.035.7-.371 1.672-.557 2.94-.557 1.941 0 3.56.663 4.719 1.83 1.726 1.91 1.726 3.448 1.807 4.801 0 .982-.135 1.777-.594 3.024-.701 1.83-3.074 3.713-5.933 3.607-1.267 0-2.238-.186-2.94-.53-1.402-.743-2.022-1.353-2.561-2.228h-.054v6.79c0 .477-.216.716-.675.742-.458-.026-.7-.265-.7-.742V18.335c0-.504.242-.743.7-.77.46.027.675.266.675.77m17.605-5.968v17.399c0 .477-.242.716-.7.743-.432-.027-.648-.266-.675-.743v-17.4c.027-.477.243-.715.674-.742.46.027.702.265.702.743m5.464 10.901h10.598c-.35-2.758-2.373-4.589-5.286-4.589-2.966 0-4.962 1.83-5.312 4.589m11.084 1.247h-11.111c.215 2.917 2.265 4.88 5.475 4.88 1.914 0 3.397-.77 4.368-1.963a.62.62 0 0 1 .513-.265c.458.026.7.265.7.716a.612.612 0 0 1-.188.45c-1.24 1.433-3.047 2.335-5.393 2.335-2.077 0-3.803-.664-5.017-1.83-1.78-1.91-1.834-3.448-1.887-4.8 0-.982.107-1.805.62-2.998.755-1.857 3.155-3.767 6.148-3.634 3.857 0 6.608 2.626 6.608 6.313-.027.503-.324.769-.836.796m15.116 4.747a.773.773 0 0 1 .243.584c-.027.424-.27.636-.728.663-.216 0-.405-.106-.567-.292l-4.88-5.358-4.936 5.384a.633.633 0 0 1-.54.266c-.43-.027-.647-.266-.674-.69a.63.63 0 0 1 .19-.477l5.015-5.358-4.827-5.172c-.162-.186-.243-.372-.243-.584.027-.424.27-.636.728-.663.216 0 .405.107.567.292l4.746 5.252 4.773-5.279a.706.706 0 0 1 .54-.265c.431.027.647.265.674.69a.634.634 0 0 1-.189.477l-4.854 5.226 4.962 5.304z"
    />
    <Path
      fill="#43B02A"
      d="M21.135 8.867l5.553-4.355-12.48 2.8 6.927 1.555zm4.32.971l2.097-4.281L22.84 9.25l2.613.587zm3.325.747l.001-4.438-1.958 3.998 1.957.44zm3.978.893l-2.609-5.326v4.74l2.609.586zm-15.084.103l2.092-1.64-5.862-1.318 3.77 2.958zm23.72 1.838l-10.016-7.86 3.086 6.303 6.93 1.557zm-26.387.254l1.57-1.231-3.527-2.767 1.957 3.998zm7.67 1.834l2.168-4.426-3.373-.757-2.7 2.118 3.906 3.065zm13.708.28l4.705-1.056-5.867-1.318 1.162 2.373zm-24.568.388l2.092-1.641-2.091-4.274-.001 5.915zm18.33 1.01l4.87-1.092-1.5-3.063-3.369-.757v4.912zm-4.144.93l2.776-.623v-5.526l-2.565-.577-2.44 4.978 2.23 1.748zm11.863.694l3.529-2.766-4.4.987.87 1.78zm-15.328.083l1.759-.394-1.131-.888-.628 1.282zm-4.485 1.006l2.779-.623 1.237-2.525-4.395-3.448-2.058 1.615 2.437 4.981zm10.725.394v-1.42l-1.407.316 1.407 1.104zm-16.962 1.005l4.869-1.092-2.167-4.427-2.702 2.118v3.401zm-6.925.31l5.557-4.36.001-6.988-5.558 11.347zm14.398.817l.783-1.599-1.41.317.627 1.282zm20.347.001l2.611-5.33-3.772 2.958 1.16 2.372zm-33.893.234l4.704-1.055V18.97l-4.704 3.69zm26.632.455l4.394-3.444-1.143-2.333-5.48 1.229v2.8l2.23 1.748zm-2.23 1.748l1.133-.887-1.132-.889v1.776zm-19.699.097l.001-1.975-4.399.987 4.398.988zm6.848 1.538l1.235-2.522-1.236-2.526-5.477 1.229-.001 2.588 5.479 1.23zm20.083.54l1.5-3.062-1.5-3.061-3.904 3.061 3.904 3.062zm-17.308.083l-.78-1.594-.627 1.278 1.407.316zm5.594 1.257l3.114-2.441v-3.923l-3.112-2.442-3.887.872-1.73 3.532 1.727 3.529 3.888.873zm-15.217.597V26.34l-4.704-1.057 4.704 3.691zm18.33.102v-1.419L27.37 28.76l1.406.316zm14.702 1.195l.002-12.592-3.085 6.297 3.083 6.295zm-20.316.067l1.133-.888-1.761-.396.628 1.284zm12.462.276l1.144-2.333-4.393-3.446-2.23 1.75v2.798l5.48 1.231zm6.623.244l-2.611-5.332-1.162 2.372 3.773 2.96zm-.853 1.052l-3.53-2.769-.871 1.78 4.4.99zm-26.878.258l2.168-4.427-4.87-1.094v3.4l2.702 2.121zm20.704 2.37l5.87-1.316-4.707-1.057-1.163 2.374zm-17.55.106l4.394-3.445-1.237-2.528-2.774-.623-2.44 4.981 2.057 1.615zm12.473 1.034l3.371-.756 1.5-3.064-4.87-1.094-.001 4.914zm-3.936.883l2.567-.576.002-5.528L26 29.833l-2.23 1.749 2.436 4.979zm-4.739 1.063l3.37-.756-2.165-4.426-3.906 3.063 2.701 2.119zm-11.023.061v-6.989l-5.555-4.36 5.555 11.35zm1.368 0l2.094-4.273-2.093-1.643-.001 5.917zm1.232.585l3.528-2.766-1.57-1.231-1.958 3.997zm.854 1.052l5.863-1.315-2.092-1.642-3.771 2.957zm14.874 2.483l.001-4.44-1.958.44 1.957 4zm1.369 0l2.612-5.333-2.611.586-.001 4.748zm-2.602.583l-2.093-4.276-2.61.585 4.703 3.691zm3.834.001l10.02-7.855-6.933 1.555-3.087 6.3zm-4.691 1.049L21.13 39.08l-6.928 1.554 12.48 2.804zm2.775 4.238a2.98 2.98 0 0 1-2.325-1.101 2.896 2.896 0 0 1-.646-1.801L13.788 41.92a2.97 2.97 0 0 1-2.662 1.63c-.91 0-1.757-.4-2.324-1.1a2.888 2.888 0 0 1 .454-4.092L3.608 26.82a3.02 3.02 0 0 1-.639.068c-.91 0-1.757-.4-2.322-1.098a2.893 2.893 0 0 1 .47-4.106 2.964 2.964 0 0 1 1.846-.635c.218 0 .435.023.648.07l5.653-11.54a2.867 2.867 0 0 1-1.082-2.595 2.89 2.89 0 0 1 1.1-1.958 2.97 2.97 0 0 1 1.85-.637c.91 0 1.758.4 2.325 1.1.13.16.244.34.34.534l12.697-2.848A2.88 2.88 0 0 1 27.61.913a2.97 2.97 0 0 1 1.85-.638c.91 0 1.758.401 2.325 1.101.705.87.843 2.063.363 3.066l10.185 7.992a2.97 2.97 0 0 1 1.831-.623c.911 0 1.758.401 2.325 1.1a2.893 2.893 0 0 1-.47 4.107 2.956 2.956 0 0 1-1.17.557l-.003 12.804c.647.15 1.227.51 1.64 1.022a2.891 2.891 0 0 1-.471 4.106 2.968 2.968 0 0 1-1.849.637 3.01 3.01 0 0 1-1.837-.623l-10.185 7.986a2.897 2.897 0 0 1-.835 3.531 2.97 2.97 0 0 1-1.85.638z"
      mask="url(#b)"
    />
    <Path
      fill="#43B02A"
      d="M75.563 14.695c0-1.565-1.29-2.833-2.881-2.833-1.591 0-2.88 1.268-2.88 2.833 0 1.33.934 2.444 2.192 2.748v12.323c.027.477.243.716.675.743.458-.027.7-.266.7-.743V17.443c1.259-.304 2.194-1.417 2.194-2.748"
    />
  </Svg>
);

export default SimpleX;
