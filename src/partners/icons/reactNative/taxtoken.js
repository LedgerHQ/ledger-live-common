// @flow

import React from "react";
import Svg, { Path, G } from "react-native-svg";

type Props = {
  width: number
};

const TaxToken = ({ width = 150 }: Props) => (
  <Svg width={width} height={(width * 185) / 330} viewBox="0 0 330 185">
    <G fill="none" fillRule="evenodd">
      <Path
        fill="#17394F"
        d="M57.6255556 13.0372746c3.6015345 0 6.5176352-2.9191069 6.5176352-6.52064148 0-.23348847-.0130273-.46296855-.0360755-.68944234C63.761392 2.55334172 60.9936017 0 57.6255556 0c-3.3680462 0-6.1358365 2.55334172-6.4815598 5.82719078-.0230482.22647379-.0370776.45595387-.0370776.68944234 0 3.60153458 2.9171028 6.52064148 6.5186374 6.52064148"
      />
      <Path
        fill="#008F63"
        d="M18.090847 44.401891l10.0871027 3.2798616c4.4803732-10.1772914 14.1776604-17.5366876 25.7057778-18.6810817V18.3964864c-5.060587-1.3588428-8.8024151-5.9183816-8.9216646-11.38181135C30.1310356 10.3576688 17.581782 19.7142432 10.0209644 32.4017862c5.1597945 1.797761 8.3394465 6.7661551 8.0698826 12.0001048l78.2592843 23.5108421"
      />
      <Path
        fill="#17394F"
        fillRule="nonzero"
        d="M57.7798784 72.8584235c-6.6669476 0-12.0702516-5.4053082-12.0702516-12.0732579 0-6.6659455 5.403304-12.0682474 12.0702516-12.0682474s12.0732579 5.4023019 12.0732579 12.0682474c0 6.6679497-5.4063103 12.0732579-12.0732579 12.0732579z"
      />
      <Path
        fill="#17394F"
        fillRule="nonzero"
        d="M57.7788763 35.0733753c-7.1038616 0-13.5132704 2.8730104-18.1770272 7.5357652-4.6597485 4.6637568-7.5347631 11.0731656-7.5347631 18.1760251 0 7.1018575 2.8750146 13.5142726 7.5347631 18.1780294 4.6637568 4.6597484 11.0751698 7.5347631 18.1770272 7.5347631 7.1038616 0 13.5132705-2.8750147 18.1770273-7.5347631 4.6607505-4.6637568 7.5347631-11.0761719 7.5347631-18.1780294 0-7.1028595-2.8740126-13.5122683-7.5347631-18.1760251-4.6637568-4.6627548-11.0731657-7.5357652-18.1770273-7.5357652z"
      />
      <Path
        fill="#17394F"
        d="M4.50507925 49.7924068c3.42416312 1.1143313 7.09985285-.7615933 8.21217985-4.1857568 1.111325-3.4211572-.7615932-7.0978491-4.18375258-8.209174-.22647379-.073153-.45294758-.1332788-.67942138-.1803774-3.21873335-.6774172-6.4945866 1.1654382-7.5337606 4.3631279-1.03817191 3.1976897.52810482 6.6118323 3.52838155 7.9576478.21244444.093195.42989937.1803774.65637316.2545325"
      />
      <Path
        fill="#00703E"
        d="M86.8326583 47.6787463L96.919761 44.401891c-.2685618-5.2339497 2.9120922-10.2023438 8.070885-12.0001048-7.5598158-12.687543-20.1080674-22.0441174-34.9410988-25.38711115-.1192495 5.46342975-3.8610776 10.02296855-8.9216646 11.38181135v10.6041845c11.5271153 1.1443941 21.2244025 8.5037903 25.7047757 18.6780754zM58.1957484 91.4873962c-5.7911153 0-11.2174675-1.5742935-15.8812243-4.3050063l-6.2390524 8.5839581c3.2968973 4.0805367 3.6436226 9.97086.5210901 14.460252 6.628868 2.851966 13.9281384 4.439287 21.6001887 4.439287 7.6710482 0 14.9743271-1.587321 21.6001887-4.439287-3.1215304-4.489392-2.774805-10.3827216.5210902-14.460252l-6.2370483-8.5839581c-4.665761 2.7307128-10.090109 4.3050063-15.8852327 4.3050063z"
      />
      <Path
        fill="#17394F"
        d="M114.930582 41.5802265c-1.038172-3.1976897-4.31603-5.0405451-7.533761-4.3631279-.22447.0470986-.452948.1072244-.67842.1803774-3.423161 1.1113249-5.296079 4.7880168-4.183752 8.209174 1.112327 3.4241635 4.789019 5.2970818 8.213182 4.1857568.226474-.0741551.442927-.1613375.654369-.2545325 3.000277-1.3458155 4.566553-4.7599581 3.528382-7.9576478M94.9655788 99.8895948c-2.1154256-2.910088-6.1919539-3.5574423-9.1050483-1.4410146-2.9110901 2.1164278-3.5574423 6.1939578-1.4410146 9.1040458.1382893.192403.2876016.371778.4399203.542135 2.2076184 2.443111 5.943434 2.880025 8.6641258.901886 2.7236981-1.981144 3.4632453-5.670863 1.8178029-8.525836-.1132369-.198415-.2384989-.39182-.3757861-.5812162M30.3913893 98.4484546c-2.9120922-2.1164277-6.9896226-1.4690734-9.1040461 1.4430189-.1382893.1873925-.2615472.3807965-.3767883.5792115-1.6454423 2.854972-.9058951 6.547698 1.817803 8.525836 2.7216939 1.978139 6.4575094 1.541225 8.6631237-.901887.156327-.170356.3036352-.349731.4419245-.542134 2.1154256-2.910088 1.4700755-6.987618-1.4420168-9.1040454"
      />
      <Path
        fill="#00B412"
        d="M36.7308428 83.5928805c-6.4675304-5.7730776-10.547065-14.1656352-10.5480671-23.5101845 0-2.2988092.2545325-4.5404989.7225115-6.7010189l-10.0840964-3.2768553c-2.8589812 4.3901845-8.34746334 6.5416855-13.57740464 4.967392-.14931237 1.651455-.23749685 3.3219497-.23749685 5.0104822 0 13.8179078 5.13374004 26.4272872 13.58642349 36.0554298 3.3059161-4.3440881 9.0088469-5.8301971 13.8990776-3.959283l6.2390524-8.5859623zM79.165618 83.5928805c6.46753-5.7730776 10.547065-14.1656352 10.548067-23.5101845 0-2.2988092-.254532-4.5404989-.722511-6.7010189l10.0840961-3.2768553c2.8589811 4.3901845 8.3474633 6.5416855 13.5774046 4.967392.1493124 1.651455.2374969 3.3219497.2374969 5.0104822 0 13.8179078-5.1337401 26.4272872-13.5864235 36.0554298-3.3059162-4.3440881-9.0088471-5.8301971-13.8990771-3.959283l-6.239053-8.5859623z"
      />
      <Path
        fill="#17394F"
        fillRule="nonzero"
        d="M321.670163 84.8157258c-.699528-.1223513-2.291558-.5628161-3.473519-.9788107-7.260619-2.4470268-12.51914-8.2464803-14.569481-16.0280254C303.072365 65.6799764 303 64.9213981 303 61.4710903c0-3.4013672.072365-4.2088861.603041-6.2399183 2.219193-8.4422424 8.032512-14.3885175 16.354484-16.6887227 1.785003-.4894054 2.581017-.5628162 6.151022-.5383459 4.969062.0244703 6.657578.3915243 10.61353 2.4225565 4.655479 2.373616 7.71893 5.5058103 10.010487 10.2775125C348.517567 54.4481234 349 56.7238583 349 61.4710903c0 3.2545456-.072365 4.2822969-.530676 6.117567-.675407 2.6672592-2.460409 6.5580317-4.004196 8.6135342-2.942842 3.9397132-7.357105 6.851675-12.567383 8.2954208-1.712638.4649351-8.225485.6851675-10.227582.3181135zm9.238594-4.3801779c8.080755-2.0799728 13.411642-9.6412856 13.411642-18.9644576 0-5.9462751-1.833246-10.595626-5.66859-14.4619283-1.592029-1.6150377-2.388044-2.2023241-4.245412-3.1321943-3.159937-1.5660971-4.776088-1.9331512-8.418458-1.9576214-3.594127 0-5.861562.5628161-8.683796 2.104443-4.438385 2.4225565-7.453592 6.3622696-8.973257 11.8191394-.458311 1.6639782-.530676 2.5204376-.530676 5.7505129 0 3.4258375.072365 4.013124.675406 5.9952157 2.219193 7.4144911 7.501835 12.1617231 14.738333 13.3362959 2.002097.2936433 5.499737.0978811 7.694808-.4894053z"
      />
      <Path
        fill="#17394F"
        d="M154.648649 66.1467391V48.2934783H142V39h36v9.2934783H165.351351V84h-10.702702z"
      />
      <Path
        fill="#17394F"
        fillRule="nonzero"
        d="M174.312963 83.2173913c.409259-.9538043 6.716667-16.2146739 13.457407-32.5271739L192.609259 39H203.081481l.481482 1.173913c.264815.6358696 2.431481 5.9429348 4.814815 11.7880435 2.383333 5.8451087 5.874074 14.3804348 7.751852 18.9538044 1.877777 4.5733695 3.707407 9.048913 4.044444 9.9782608.361111.9048913.698148 1.638587.77037 1.638587.096297-.0244565 10.688889-16.1902174 14.251852-21.7663044l.433334-.660326L230.55 52.548913c-2.792593-4.1576087-5.994444-8.9021739-7.101852-10.5407608L221.425926 39H234.305556l4.068518 6.8722826c2.214815 3.7663044 4.140741 6.7744565 4.237037 6.6521739.12037-.0978261 1.95-3.1548913 4.068519-6.798913l3.851851-6.6032609 6.235186-.0733696L263.001852 39l-6.933333 10.5652174c-3.803704 5.7961956-6.861112 10.6630435-6.788889 10.8097826.096296.1467391 3.659259 5.4538043 7.944444 11.8125S265 83.8043478 265 83.8777174C265 83.951087 262.038889 84 258.451852 84l-6.572222-.0244565-3.803704-6.2853261c-2.07037-3.4483696-4.261111-7.0434783-4.838889-7.9728261l-1.059259-1.6875-4.646297 7.9728261L232.861111 84l-11.675926-.0733696-11.651852-.048913L207.8 79.4755435l-1.709259-4.4021739L197.544444 75l-8.57037-.048913-1.637037 4.5244565L185.675926 84H174l.312963-.7826087zm28.816667-16.875c0-.048913-1.227778-3.5217391-2.744445-7.7282609l-2.744444-7.6793478-.601852 1.6875c-1.251852 3.3505435-4.983333 13.5978261-4.983333 13.6956522 0 .048913 2.503703.0733695 5.537037.0733695 3.057407 0 5.537037-.0244565 5.537037-.048913z"
      />
      <Path
        fill="#17394F"
        d="M279.28169 63.4565217V42.9130435H264V39h35V42.9130435h-15.035211V84h-4.683099zM358 61.5V39h4.681159l.049276 10.0027174.073913 10.0271739 10.692753-10.0271739L384.189855 39h3.153623c1.749276 0 3.178261.048913 3.178261.0978261 0 .0733696-5.026087 4.5978261-11.136232 10.0760869-6.134782 5.4782609-11.160869 10.0516305-11.160869 10.1494566 0 .0978261 5.346376 5.625 11.9 12.2771739C386.653623 78.2771739 392 83.7798913 392 83.8532609 392 83.9266304 390.521739 84 388.723188 84h-3.252174l-11.333333-11.9836957-11.333333-12.0081521-.073913 12.0081521L362.681159 84H358V61.5zM397 61.5V39h28.262712V42.9130435h-23.59322V58.5652174h21.872881V62.4782609h-21.872881v17.3641304H426V84h-29zM434 61.5V39l3.009333.0732899 3.009334.0732899 13.098 18.9820847L466.19 77.0863192l.074-19.0309446.049333-19.0309446H471V84l-2.886-.0732899-2.886-.0732899-13.196667-19.3485342L438.81 45.1807818l-.074 19.3973941-.049333 19.3973941H434z"
      />
    </G>
  </Svg>
);

export default TaxToken;
