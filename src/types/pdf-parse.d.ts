declare module "pdf-parse" {
  interface PDFData {
    text: string;
    numpages: number;
    info: Record<string, any>;
    metadata: Record<string, any>;
    version: string;
  }

  function parse(
    dataBuffer: Buffer,
    options?: Record<string, any>
  ): Promise<PDFData>;

  export default parse;
}
