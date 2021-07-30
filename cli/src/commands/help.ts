
import { from } from "rxjs"; 
import { commands } from "../interactive";

const args = [];
export default {
  description: "Displays list of commands to the user",
  args,
  job: () =>
    from(
      [  
        console.log("Ledger Live @ https://github.com/LedgerHQ/ledger-live-common"),
        console.log(""),
        console.log("Usage: ledger-live <command> ..."),
        console.log(""),
        displayCommands(),
        console.log(""),
      ]
    ),
};

const displayCommands = () => {
  for (const k in commands) { 
    const cmd = commands[k];
    console.log(
      `Usage: ledger-live ${k} `.padEnd(30) +
        (cmd.description ? `# ${cmd.description}` : "")
    );
    for (const opt of cmd.args) {
      let str = opt.alias ? ` -${opt.alias}, ` : "     ";
      str += `--${opt.name}`;
      if ((opt.type && opt.type !== Boolean) || opt.typeDesc) {
        str += ` <${opt.typeDesc || opt.type.name}>`;
      }
      if (opt.desc) {
        str = str.padEnd(30) + `: ${opt.desc}`;
      }
      console.log(str);
    }
  }
    console.log("");
}