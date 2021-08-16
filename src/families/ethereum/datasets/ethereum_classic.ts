import type { CurrenciesData } from "../../../types";
import type { Transaction } from "../types";
const dataset: CurrenciesData<Transaction> = {
  scanAccounts: [
{
      name: "ethereum_classic seed 1",
      apdus: `
      => e002000009028000002c8000003d
      <= 4104484d1e44afab12402f8d40684619f916936eb83872b4fb0b0cdcfe84bd73db6adc535ad2d4368ee7d8df42a261e295e04aabc60d80bdb010bd791d5fe87e731d28354564426331363364613164353133363936353530344265423732353361653346303432623542379000
      => e002000011048000002c8000003c8000000000000000
      <= 4104b7577f404537d1e934a8d2a1fd2552a7f399928b5af0aad714acc17b36865b3f5d1843d6a580c737c051656ac35978283a388a759911d289e9994071247d167528356466304333363936343142384166336337653961653037364535343636654636373833313943649000
      => e002000011048000002c8000003c8000000000000001
      <= 4104bee21a16156c645d0150e262c40648b9fd938c6462efe3adf9051efe077d30b356c86b8bc8a182e58cdc514e6d0c2670f6626d34f78220187e2d279d661d23f628446336313732383838343733383239324134373236353042624133653936433261344638383739369000
      => e002000011048000002c8000003c8000000000000002
      <= 410467f77bf213f0de5fd7ae7ac2ca2b6f7ad6cacecbb8688acd0bcf0fcc5b7b58512fe786639619b9f4a513061dd0355590ec5b7d2c4d934c43a37778920bf07e1a28623262344230413836384543326530613162326533314131304142414130393365463032386544389000
      => e002000011048000002c8000003c8000000000000003
      <= 4104dcce479cd733a7972cea67f0b5bf92d786a1e62a9afe5e50ddd2f7f7c8c1aaff89e28b236f5f1e75c702c3c0116de49dde6b32f06f66937f0b190bdd730bd84e28613563334139333430364465323733666639386244443343653935314232653431423137436443469000
      => e002000011048000002c8000003c8000000000000004
      <= 4104b60582b8ea13540e5292396949f9d2ed23d9ec4344e2463e9fe7fa36c12372da03a0427c48d653dd59abfcbb7628b323076415f1fd53bc601b8071d82ddd635528393945363561463136626644393139303246623638394163373938343338633042464334373439359000
      => e002000011048000002c8000003c8000000000000005
      <= 4104126bf90b475158cb8c947dbe47d9ecdff88c34c96c7b7f4fc17a05257dff1024c089fd51f657fa7f5b1041d23bc67d46cd0dd4df86c5318f653486199313e18f28663736394533463933663831313733653836333365354461653646433031426262443163634230389000
      => e002000011048000002c8000003c8000000000000006
      <= 4104dc7934183510e92e07136e9192da7d5bbd4c3a757b4d9bdf8dcca9baabdf8efddfad24ef74e8a0db52d9e4171516665ff6e4cd152273f460627933df3ced177828463439386638653139323342653437633335343932376445334332313661633341453734666535619000
      => e002000011048000002c8000003c8000000000000007
      <= 4104b7664a7012f69cee691362377df6d8558b0acfe1541dbf95af90e919d6867ac9d46b3b0b42e98fe8543c15ae501fed3d85869fd0310d9804faed0d07ae3b871628353932393338336336626631624439666533383462423665363162394232413230416637434361429000
      => e002000011048000002c8000003c8000000000000008
      <= 41045cdb8bc99d890837444698a53d9c18d22c6159e0727e051fee54e7299318282d3fe882b4aa133e7e15529e90b824b4f83ea5242b3ad4651c7d9cca12c796e45428634339303838363541443934303634623733433739663235393861373966393843654544364446619000
      => e002000011048000002c8000003c8000000000000009
      <= 4104720ec99d2297e627e239764e519be6900d06fc3d9145e306daeace60944c3c6dc14e74f24d27fc98278c0c07de821bae71ed5c95e9a7b95538637e817763609128373731663039424535353143386346393734426141426336373365324232323132643637383236469000
      => e002000011048000002c8000003c800000000000000a
      <= 41043a98496a4115f61e264bd74ba1ea661729ccfa239e72318ecbd307fb747d2032be5e308e435b24417320a95b719d60b7740b0bf297f926b414b4d3b44d903a9f28384138383238373537353662333831336262613844644631376634304232363064423232466334379000
      => e002000011048000002c8000003c800000000000000b
      <= 41040f3a6497cdef24c68b895a0d8a9f8b54e16ee84e4905a24236a242a82a900e068cb72ad71f52b57dfa41e00090cd035d1a4205dbe3982ac88189c743edb856a828646431344537456135384533384343316134653737386265663338323831664139413134353232419000
      => e002000015058000002c8000003c800000000000000000000001
      <= 41040374fb34926a57e184cdd3438109021b3169a9c74ffe726d1abc7a187fa9440a11f071b96f72c8e9e0ea1f82dc2180166bd8c7bae9401cdd3d2466a40e1755ca28304536613732456439323243323338394466303365383666354537394261374336344535343933379000
      => e002000015058000002c8000003c800273d08000000000000000
      <= 41048ebb30f7ad91340633bf4079b094df192c01e902b978a744463612f4d92779a26a981f940f5d1562ce2f7ece9410e2a510cbf0d58a72213a32ce5a4ac5ba2b4b28384438433044364436313243426531386545393339623438383130326330463266323330306342319000
      => e002000015058000002c8000003c800273d08000000000000001
      <= 41044a0ed12ec0f81f63916275abb0a598f5cfaed33ee71a446b4cf4aa0c913f2dce6463416384b2da8aed0bc82495de7d98a4b97788a81fccabb6ccf18b02b3103f28304345383662333261393235304639373538393934396231664635386230653439383745426134319000
      => e002000015058000002c8000003c800273d08000000000000002
      <= 41047c3451f44f8e83a6d1717d02b2d753a6f48d460ce658ac11e49aa7f23e24e9c163c44de44b545e50261ecc56071646aa206449360dc3d868d60f2ecf42f81a3928423234664145303442453136363132323061303939624334614339436334634431463131323735319000
      => e002000015058000002c8000003c800273d08000000000000003
      <= 41044022220fe926b53f6ae37ab9750436da58de9954fd32b8360a084f6ba1886d89c9b0f5f54bd273eca6aef4efb5a838c1aeaffa679609b4997e4ef4375958abb628313963326334636432636131393732353142623530436235433043323537373532413631416237339000
      => e002000015058000002c8000003c800273d08000000000000004
      <= 4104f639ceaa8f6bd63edc2168e8016c28bc7bb2e88b1655c5a340eea522121f5da8dd06351dc8329430b02d865b1b62f93ea5d29f6503ee4b79a8cebfdbde0bc03228306435663331313344393237413532333631356139303338644236343963334135613335313766439000
      => e002000015058000002c8000003c800273d08000000000000005
      <= 4104fab595f8b864663c1dd3dcdcff04e79ef2c552a2a9bfdaa1f2870ee4fbb577d165444d1b88c89a93e7dec0fac582698cfb6d22ca0912fabc8f59b510e8d14aeb28613832643633303962416438343444663331333531646644354563323436333330643036334166339000
      => e002000015058000002c8000003c800273d08000000000000006
      <= 410428bf0106161a8f6ee85702c927daf25b0933e87f30912c3731dd82cb734b8368358dd7b395f6a308ad10df2e669730e88f4bb25af4e470d0676330c9516c1e3228383946623865386531353134454435383837443430353439313130353033394539616531333861339000
      => e002000015058000002c8000003c800273d08000000000000007
      <= 4104e9862872e1bd6db9369ce076c73e96cf5c48e3247cb57bc830835d5f9a1b561f170ccc871834083b55ec67146c82674c6198b1b1ff8d388ffc768eb39e1fdf9728323544336463393734353145453137456565363537374661653843453133653936313738623862399000
      => e002000015058000002c8000003c800273d08000000000000008
      <= 41048267b52b06601d87bf6cc3aced6de50b5f9575b447cffaaf8575fc9ff0e3f20a82476e8798c805ad192946d5a7e0291e15d2ca2aa64554b77ba044d3558dd9bf28304331396631383643323064454241333934393937393431353845316339334641343039626238659000
      => e002000015058000002c8000003c800273d08000000000000009
      <= 41045a03c0346a5744a2dc91720b58e09e19ca614e014e0ba2b2f16335ad759f94585cecf2be542b9c559b45f13781d19255d9d07b1c2a3c3edd233fe0f31056278c28433663364662643362303365326431463243633064313739413530373444303738313639336242459000
      => e002000015058000002c8000003c800273d0800000000000000a
      <= 410406b58afef3acc41294fa5b75dacf131e7c0a112cea3fd479d967885fd5a7dd283bedeb63289dba3d941274b74e77a54173ea9f461b785708951dd2cf6425904928424264433236384545463134356539383964376238383342373233323736644130453342353134429000
      => e002000015058000002c8000003c800273d0800000000000000b
      <= 4104d386c86afec5afc490ac49373c1853d7c52ec77084e79afe6bc4c06506647f16f1cca01cecb9fa9b9c858a88ac3fdea2b0e9db4dfa73bca657eb7f10edeb5e7728324364433246313866303834383337374430394661383862613546653163323865414144363065329000
      => e002000015058000002c8000003d800000000000000000000000
      <= 4104e6961fb205192c59e2fc93113b38e3e352479b8903be6900db84aa1bb3849c7beb9b60795e61ca1bb8b13be0bf4e9190fffa7021b255d639921d9e46bc82495328363939343037623045453838323936323832303531413165444265623862626635343031466539629000
      => e002000015058000002c8000003d800000010000000000000000
      <= 4104a7befc3709876c8787641f45c92fc065ffcd873338f41a571482822ae91825364c22ff2cde1ff0f91d8a00926e6ff92e0b5296362f4b6cce3ea02393505dbadb28323863386162303964633038463266363237623538384233363035353930413238363162336344319000
      `,
    },
  ],
};
export default dataset;
