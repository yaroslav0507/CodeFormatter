import * as ts from "typescript";
import * as f from "../Formatter";
import { FormatCodeOptions } from "../FormatCodeOptions";
import { getIsRuleEnabled } from "../TslintProvider";
import { Options } from "../Processor";
import * as Lint from "tslint/lib/lint";
import * as Linter from "tslint";

interface IJsDoc
{
    text: string;
    startPosition: number;
    endPosition: number;
    leadingTrivia: string;
    endingTrivia: string;
}

class Formatter implements f.Formatter
{
    public name: string;
    public edits: f.TextChange[] = [];
    public JS_DOCK_START_STATEMENT = "/**";
    public JS_DOCK_END_STATEMENT = "*/";
    public JS_DOCK_ASTERISK_CHAR = "*";
    public NEW_LINE_CHAR = "\r\n";

    private _sourceFile: ts.SourceFile;
    private _opts: Options;
    private _formatOptions: FormatCodeOptions;
    private _lintRuleName: string = "jsdoc-format";


    public isApplicable(formatOptions: FormatCodeOptions): boolean
    {
        return getIsRuleEnabled(formatOptions.TsLintRules[this._lintRuleName]);
    }

    public format(sourceFile: ts.SourceFile, opts: Options, formatOptions: FormatCodeOptions): f.TextChange[]
    {
        this._sourceFile = sourceFile;
        this._opts = opts;
        this._formatOptions = formatOptions;

        const ruleFailures = this._lintSourceFile().failures;
        const jsDocComments = this._getJsDocComments(ruleFailures);


        jsDocComments.forEach((comment, index) =>
        {
            const leadingCommentIndent = (() =>
            {
                let lines = comment.text.split(this.NEW_LINE_CHAR);
                lines = lines.filter((line: string) =>
                {
                    return !/^\s*$/.test(line);
                });
                return lines[0].split(this.JS_DOCK_START_STATEMENT)[0];
            })();

            let jsDocComment: string = "";
            let jsDocCommentBody = comment.text.split(this.JS_DOCK_START_STATEMENT)[1]
                                                 .split(this.JS_DOCK_END_STATEMENT)[0].trim()
                                                 .split(new RegExp(`(?=[${this.JS_DOCK_ASTERISK_CHAR}])`));

            jsDocCommentBody = jsDocCommentBody.filter((line: string) =>
            {
                return !/^\s*$/.test(line);
            });

            jsDocComment += comment.leadingTrivia + this.JS_DOCK_START_STATEMENT + "\r\n";

            jsDocCommentBody.forEach((line) =>
            {
                jsDocComment += leadingCommentIndent + " " + line.trim() + this.NEW_LINE_CHAR;
            });

            jsDocComment += leadingCommentIndent + " " + this.JS_DOCK_END_STATEMENT;

            const fixedComment = jsDocComment + comment.endingTrivia;
            const width = comment.endPosition - comment.startPosition;

            const formattedJsDoc = {
                span: { start: comment.startPosition, length: width },
                newText: fixedComment,
                priority: index,
            };

            this.edits.push(formattedJsDoc);
        });

        return this.edits;
    }

    private _lintSourceFile(): Lint.LintResult
    {
        const configuration: any = { rules: { } };

        configuration.rules[this._lintRuleName] = this._formatOptions.TsLintRules[this._lintRuleName];

        const linter = new Linter(
            this._sourceFile.fileName, this._sourceFile.getFullText(),
            {
                configuration: configuration,
                rulesDirectory: this._opts.tslintRulesDir
            });
        return linter.lint();
    }

    private _getJsDocComments(ruleFailures: Lint.RuleFailure[]): IJsDoc[]
    {
        let jsDocComments: IJsDoc[] = [];

        for (let i = ruleFailures.length - 1; i >= 0; i--)
        {
            const failure = ruleFailures[i];
            const failureStartPosition = failure.getStartPosition().getPosition();

            const node = (ts as any).getTokenAtPosition(this._sourceFile, failureStartPosition) as ts.Node;
            const startPosition = node.getFullStart();
            const endPosition = startPosition + node.getLeadingTriviaWidth();
            const fullText = node.getFullText().slice(0, endPosition);

            let leadingTrivia = fullText.split(this.JS_DOCK_START_STATEMENT)[0];
            let endingTrivia = fullText.split(this.JS_DOCK_END_STATEMENT)[1];
                endingTrivia = /^\s*/.exec(endingTrivia)[0];

            const jsDocWidth = fullText.indexOf(this.JS_DOCK_END_STATEMENT) + this.JS_DOCK_END_STATEMENT.length;
            const text = fullText.substr(0, jsDocWidth);

            if(!jsDocComments.some(item => (item.text === text)))
                jsDocComments.push({
                    text,
                    startPosition,
                    endPosition,
                    leadingTrivia,
                    endingTrivia
                });
        }
        return jsDocComments;
    }
}

export { Formatter };