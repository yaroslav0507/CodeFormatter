import * as chai from 'chai';
import * as mocha from 'mocha';
import * as fs from "fs";
import * as path from "path";
import * as CodeFormatter from "../Processor";
import { FormatCodeOptions } from "../FormatCodeOptions";

chai.config.includeStack = false;
const expect = chai.expect;

const caseGroupExportsAtEnd = "GroupExportsAtEnd";

describe(caseGroupExportsAtEnd, function()
{
	let tsLintRules: any;

	beforeEach(() => {
		tsLintRules = {
			"indent": [true, "tabs"],
			"crm-group-exports-at-end": true
		};
	});

	it("should reorder export statements when they are laid out the wrong way initially", function ()
	{
		checkFormatter(
			caseGroupExportsAtEnd, 
			"NeedsReordering.ts", 
			"NeedsReordering_ref.ts",
			tsLintRules
		);
	});

	it("should not change anything when the exports order is correct initially", function()
	{
		checkFormatter(
			caseGroupExportsAtEnd, 
			"NoReordering.ts", 
			"NoReordering_ref.ts",
			tsLintRules);
	});
});

const caseOpeningBraceOnNewLine = "OpeningBraceOnNewLine";

describe(caseOpeningBraceOnNewLine, function()
{
	it("should place opening curly braces, if statements, else statements on a new line", function ()
	{
		checkFormatter(
			caseOpeningBraceOnNewLine, 
			"NeedsFormatting.ts", 
			"NeedsFormatting_ref.ts", 
			{ "crm-braces-own-line": true });
	});

	it("should not change anything when the file is formatted properly initially", function()
	{
		checkFormatter(
			caseOpeningBraceOnNewLine, 
			"NoFormatting.ts", 
			"NoFormatting_ref.ts", 
			{ "crm-braces-own-line": true });
	});
});

const caseForceImportSpacing = "ForceImportSpacing";

describe(caseForceImportSpacing, function()
{
	it("should place a single space on the boundaries of an import curly braces block", function ()
	{
		checkFormatter(
			caseForceImportSpacing, 
			"NeedsSingleSpace.ts", 
			"NeedsSingleSpace_ref.ts", 
			{ "crm-force-import-spacing": [true, "force-single-space"] });
	});

	it("should not change anything when the file is formatted with single space initially", function()
	{
		checkFormatter(
			caseForceImportSpacing, 
			"NoNeedForSingleSpace.ts", 
			"NoNeedForSingleSpace_ref.ts", 
			{ "crm-force-import-spacing": [true, "force-single-space"] });
	});

	it("should remove any whitespace on the boundaries of an import curly braces block", function ()
	{
		checkFormatter(
			caseForceImportSpacing, 
			"NeedsNoWhitespace.ts", 
			"NeedsNoWhitespace_ref.ts", 
			{ "crm-force-import-spacing": [true, "force-no-space"] });
	});

	it("should not change anything when the file is formatted with no space initially", function()
	{
		checkFormatter(
			caseForceImportSpacing, 
			"NoNeedForNoWhitespace.ts", 
			"NoNeedForNoWhitespace_ref.ts", 
			{ "crm-force-import-spacing": [true, "force-no-space"] });
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
