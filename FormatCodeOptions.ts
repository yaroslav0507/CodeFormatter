import { TslintRules } from "./Processor";

interface FormatCodeOptions
{
	NewLineCharacter: string;
	TabCharacter: string,
	FourSpacesIndent: string,
	TsLintRules: TslintRules;
}

function createDefaultFormatCodeOptions(): FormatCodeOptions
{
	return {
		NewLineCharacter: '\r\n',
		TabCharacter: '\t',
		FourSpacesIndent: '    ',
		TsLintRules: {}
	};
}

export { FormatCodeOptions, createDefaultFormatCodeOptions };