import * as chai from 'chai';
import * as mocha from 'mocha';
import * as fs from "fs";
import * as path from "path";
import * as CodeFormatter from "../Processor";
import { FormatCodeOptions } from "../FormatCodeOptions";

chai.config.includeStack = false;
const expect = chai.expect;

describe("group exports at end formatter", () =>
{
	const caseGroupExportsAtEnd = "GroupExportsAtEnd";
	let tsLintRules: any;

	beforeEach(() => {
		tsLintRules = {
			"indent": [true, "tabs"],
			"crm-group-exports-at-end": true
		};
	});

	it("should reorder export statements when they are laid out the wrong way initially", () =>
	{
		checkFormatter(
			caseGroupExportsAtEnd, 
			"NeedsReordering.ts", 
			"NeedsReordering_ref.ts",
			tsLintRules
		);
	});

	it("should not change anything when the exports order is correct initially", () =>
	{
		checkFormatter(
			caseGroupExportsAtEnd, 
			"NoReordering.ts", 
			"NoReordering_ref.ts",
			tsLintRules
		);
	});
});


describe("opening brace on the new line formatter", () =>
{
	const caseOpeningBraceOnNewLine = "OpeningBraceOnNewLine";

	it("should place opening curly braces, if statements, else statements on a new line", () =>
	{
		checkFormatter(
			caseOpeningBraceOnNewLine, 
			"NeedsFormatting.ts", 
			"NeedsFormatting_ref.ts", 
			{ "crm-braces-own-line": true }
		);
	});

	it("should not change anything when the file is formatted properly initially", () =>
	{
		checkFormatter(
			caseOpeningBraceOnNewLine, 
			"NoFormatting.ts", 
			"NoFormatting_ref.ts", 
			{ "crm-braces-own-line": true }
		);
	});
});


describe("force import spacing formatter", function()
{
	const caseForceImportSpacing = "ForceImportSpacing";

	it("should place a single space on the boundaries of an import curly braces block", () =>
	{
		checkFormatter(
			caseForceImportSpacing, 
			"NeedsSingleSpace.ts", 
			"NeedsSingleSpace_ref.ts", 
			{ "crm-force-import-spacing": [true, "force-single-space"] }
		);
	});

	it("should not change anything when the file is formatted with single space initially", () =>
	{
		checkFormatter(
			caseForceImportSpacing, 
			"NoNeedForSingleSpace.ts", 
			"NoNeedForSingleSpace_ref.ts", 
			{ "crm-force-import-spacing": [true, "force-single-space"] }
		);
	});

	it("should remove any whitespace on the boundaries of an import curly braces block", () =>
	{
		checkFormatter(
			caseForceImportSpacing, 
			"NeedsNoWhitespace.ts", 
			"NeedsNoWhitespace_ref.ts", 
			{ "crm-force-import-spacing": [true, "force-no-space"] }
		);
	});

	it("should not change anything when the file is formatted with no space initially", () =>
	{
		checkFormatter(
			caseForceImportSpacing, 
			"NoNeedForNoWhitespace.ts", 
			"NoNeedForNoWhitespace_ref.ts", 
			{ "crm-force-import-spacing": [true, "force-no-space"] }
		);
	});
});

describe("JSDoc comments formatter", () => {
	const caseJsDocIndents = "jsDocIndents";

	it("should fix indentation of jsDoc comments if it's broken", () => {
		checkFormatter(
			caseJsDocIndents,
			"NeedsFormatting.ts",
			"NeedsFormatting_ref.ts",
			{ "jsdoc-format": true }
		)
	});
});

describe("semicolon after function definition formatter", () => {
	const caseJsDocIndents = "SemicolonAfterFunction";

	it("should remove semicolons after function definitions", () => {
		checkFormatter(
			caseJsDocIndents,
			"NeedsFormatting.ts",
			"NeedsFormatting_ref.ts",
			{ "crm-no-semicolon-after-function-definition": true }
		)
	});
});

describe("semicolon after export formatter", () => {
	const caseSemicolonAfterExport = "SemicolonAfterExport";

	it("should add semicolons after export declarations", () => {
		checkFormatter(
			caseSemicolonAfterExport,
			"NeedsFormatting.ts",
			"NeedsFormatting_ref.ts",
			{ "crm-semicolon-after-export": true }
		)
	});
});


describe("trailing white-spaces formatter", () => {
	const caseTrimWhiteSpaces = "TrimWhiteSpaces";

	it("should trim any redundant white-space characters at the end of lines", () => {
		checkFormatter(
			caseTrimWhiteSpaces,
			"NeedsFormatting.ts",
			"NeedsFormatting_ref.ts",
			{ "no-trailing-whitespace": true }
		)
	});
});

function checkFormatter(testCase: string,
						fileToFormat: string,
						fileToRefer: string,
						tslintRules: CodeFormatter.TslintRules): void
{
	const testContent = processFileContents(testCase, fileToFormat, tslintRules);
	const referenceContent = readFileContents(testCase, fileToRefer);
	
	expect(testContent).to.be.equal(referenceContent);
}

function readFileContents(testCase: string, fileName: string): string
{
	const fullFileName = getCaseFileName(testCase, fileName);
	return fs.readFileSync(fullFileName).toString();
}

function processFileContents(testCase: string,
							 fileName: string,
							 tslintRules: CodeFormatter.TslintRules): string
{
	const content = readFileContents(testCase, fileName);
	const context: CodeFormatter.Context = {
		opts: {
			replace: false,
			baseDir: path.resolve(__dirname, "../../"),
			formattersDir: path.resolve(__dirname, "../formatters"),
			tslint: true,
			tslintRulesDir: path.resolve(__dirname, "../../../TslintRules/bin"),
			verbose: false
		}
	};
	const formatOptions: FormatCodeOptions = {
		NewLineCharacter: "\r\n",
		FourSpacesIndent: "    ",
		TabCharacter: '\t',
		TsLintRules: tslintRules
	};
	const result = CodeFormatter.processString(fileName, content, context, formatOptions);

	return result.dest;
}

function getCaseFileName(testCase: string, fileName: string): string
{
	return path.resolve(__dirname, "../../test/cases", testCase, fileName);
}
