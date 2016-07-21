import * as ts from "typescript";
import * as f from "../Formatter";
import { FormatCodeOptions } from "../FormatCodeOptions";
import { getIsRuleEnabled } from "../TslintProvider";
import { Options } from "../Processor";
import * as Lint from "tslint/lib/lint";
import * as Linter from "tslint";

class Formatter implements f.Formatter {
    public name: string;
    public edits: f.TextChange[] = [];

    private _lintRuleName: string = "crm-no-semicolon-after-function-definition";

    public isApplicable(formatOptions: FormatCodeOptions): boolean
    {
        return getIsRuleEnabled(formatOptions.TsLintRules[this._lintRuleName]);
    }

    public format(sourceFile: ts.SourceFile, opts: Options, formatOptions: FormatCodeOptions): f.TextChange[]
    {
        return this.edits;
    }

}

export { Formatter };