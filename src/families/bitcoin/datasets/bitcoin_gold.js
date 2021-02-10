// @flow
import type { CurrenciesData } from "../../../types";
import type { Transaction } from "../types";

const dataset: CurrenciesData<Transaction> = {
  scanAccounts: [
    {
      name: "bitcoin_gold seed 1",
      apdus: `
      => e040000009028000002c80000000
      <= 41041caa3a42db5bdd125b2530c47cfbe829539b5a20a5562ec839d241c67d1862f2980d26ebffee25e4f924410c3316b397f34bd572543e72c59a7569ef9032f49822474c79466850314d6a657a634d77597752767556434635444e484d6e4276517237349f819c7d45eb9eb1e9bd5fa695158cca9e493182f95068b22c8c440ae6eb07209000
      => e016000000
      <= 00260017010c426974636f696e20476f6c64034254479000
      => e040000009028000002c80000000
      <= 41041caa3a42db5bdd125b2530c47cfbe829539b5a20a5562ec839d241c67d1862f2980d26ebffee25e4f924410c3316b397f34bd572543e72c59a7569ef9032f49822474c79466850314d6a657a634d77597752767556434635444e484d6e4276517237349f819c7d45eb9eb1e9bd5fa695158cca9e493182f95068b22c8c440ae6eb07209000
      => e04000000d038000002c8000000080000000
      <= 4104238878d371ce61cdd04d22ccab50c542e94ffa7a27d02d6bcefaa22e4fcee6db4c2029fd4de0b595e98002c0be01fc1fbd3568671e394c97a6d52c3d4c113fb522474e65324b4b444e79425232675338555a7a7975387253354e364b574c326943725544728146118df8d18d38c2615154eaffcdd53829957f4e26863344f35653364e9000
      => e04000000d038000002c8000000080000001
      <= 410415d2ae6368394c10962a92ab7b680e272f27c4951e2960ce11fe6d30ed9ca87dbbb1e0231da0caf45e2c7040adcb55b04eff0335ede12ca79600722846f0dc8922474b585362794443616a334a717878565976644b43715846707167435a677570513869c51a44ff9a3b3f2d041491ef614064b0193142057576c147763fe9493343879000
      => e040000109028000003180000000
      <= 41047615032ad01c87f38c5401a6765aee429eb5a57ccde63573fdfe602b4de7c7ac109d1f23fbdd847c483bd147ff8218f15858f16824ecff4ca3fcb4245e2d93f522414852714e634b4335657a4d7a6d773759356e67533341484e5070547134466d32633de97255695c6fbec7459a688b0fddef585e98fae29c96655c3ff648131ca1c39000
      => e016000000
      <= 00260017010c426974636f696e20476f6c64034254479000
      => e040000109028000003180000000
      <= 41047615032ad01c87f38c5401a6765aee429eb5a57ccde63573fdfe602b4de7c7ac109d1f23fbdd847c483bd147ff8218f15858f16824ecff4ca3fcb4245e2d93f522414852714e634b4335657a4d7a6d773759356e67533341484e5070547134466d32633de97255695c6fbec7459a688b0fddef585e98fae29c96655c3ff648131ca1c39000
      => e04000010d03800000318000000080000000
      <= 410412f62e549eee10ea7df9c9b1acfa6d77abb7424c057d7d725f418e2124dcd8662e21fde9e0b5a4cb731933a68ca406f6efcdadc8fb52afdb9ae422a68cfe5bde2241584279446275734c6d663935596845394337514c6334764e506b6a727271554a70508666b8006f31778f6dbb06bdbf20088d9a84ea15776cf6073b3ea025d48d9e9000
      => e04000010d03800000318000000080000001
      <= 4104ade4dbcec2e6dafc664eb9337f784f01eb64087e19cbbf1068b6bcc535b5f1fab6094958d8f2b18c1f922d31b4a63d1f595689e2f2b3725bd6876c61a54886732241646e417841444d38475837504d324e7137724431683673584b6e4e4332416b61777adba784bff55fb0b1ae8b5ab1d1aba2883613db2f674ef00bc8df2bd7c4358e9000
      => e04000010902800000318000009c
      <= 4104899388f6905376a7bfe0f6af241243c79fbefa4b5e53bea6078118b43b7718e960fe76dc2d39cb0fa8a45a52f992cac0e3952a6422c4254a3e1ef6c861b8f022224146715a7951755564784b5a786b5a787a5745446e5a556e5a7064316548516b4a79b2524200bd364a8b68a808508b43a68d746b258134c251556dbbf2ed32243bb49000
      => e016000000
      <= 00260017010c426974636f696e20476f6c64034254479000
      => e04000010902800000318000009c
      <= 4104899388f6905376a7bfe0f6af241243c79fbefa4b5e53bea6078118b43b7718e960fe76dc2d39cb0fa8a45a52f992cac0e3952a6422c4254a3e1ef6c861b8f022224146715a7951755564784b5a786b5a787a5745446e5a556e5a7064316548516b4a79b2524200bd364a8b68a808508b43a68d746b258134c251556dbbf2ed32243bb49000
      => e04000010d03800000318000009c80000000
      <= 4104465a1e085f90dd90d6aaae53fe772371d8e8f60e93b68d4b5e4ebe345e8bcdd4adc5b0ffc9047859a33f3944220203bd093cf24e0dd22342b580c7f66c3971b02241643369734a657467447a787847346652553378364b377a6451634b52654d54436a74941b2bfea854c067aa6960f609d18bcd90953daf6116d408a3891c1b4044de9000
      => e04000010d03800000318000009c80000001
      <= 41048752532c5bd5034512f19c8c06ce4b8a0abce9625ebe675d31a94da04576123663e24dc16c30007a1e804ad9b95fc2e122caea893538e39c2facd0c31b8a5dfa224156696b367550667955726d6472554b43326861344a7263417955454b5375323538be54bc9f50ec4e106b7b888df97c9eede75fcb4c21c57f5b704d50db1912760e9000
      => e040000009028000002c8000009c
      <= 41047de02dac56e32ce9d9a7ee70bde9c6d006d6bdc3c47d675aa214bda250736f54822edbceb75f6724f9850d3e50402871d4caef53e3ec1bffe839483637eb693d224750427178396a5070634c787855476371455a467245543945656b6b413566737461c0772d5ae7811ad5c0926dfe5f88728534b305257e035457fc6840648510d2df9000
      => e016000000
      <= 00260017010c426974636f696e20476f6c64034254479000
      => e040000009028000002c8000009c
      <= 41047de02dac56e32ce9d9a7ee70bde9c6d006d6bdc3c47d675aa214bda250736f54822edbceb75f6724f9850d3e50402871d4caef53e3ec1bffe839483637eb693d224750427178396a5070634c787855476371455a467245543945656b6b413566737461c0772d5ae7811ad5c0926dfe5f88728534b305257e035457fc6840648510d2df9000
      => e04000000d038000002c8000009c80000000
      <= 4104ff80c3dcdf1aa6c92a101510dd9b830718875670fb593a7dd399a2d52af4816142b2f9072f6b025bd95a2638ed76209eff811b9308c272daafed4cf262a54f5a2247675a593647464356465a36377a61696852795755737374646754455143654e7433ae879b3112f420ef515897ab4421131269cc67adf1a4a2caaa28c77d4c2770da9000
      => e04000000d038000002c8000009c80000001
      <= 41045147388ee17dbef26dccce38015b54ecf9468ba8487232f9db6aba9bd7b66589e4c0c8b1354d68b0604475c1d7b1da5e415c7fa41f38e53351ef542d7b6541ab224759544e376f5a446744526f636a784c766965436d463869784d4862784657356f4d33dd221ae7dec0a72c88ad21c85b7b7ed24e0664f1402bd1ed37a63abbed67ea9000
      `,
    },
  ],
};

export default dataset;
