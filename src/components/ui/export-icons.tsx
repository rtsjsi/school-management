import { type SVGProps } from "react";

export function PdfIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <path d="M14 2v6h6" />
      <text
        x="12"
        y="17.5"
        textAnchor="middle"
        stroke="none"
        fill="currentColor"
        fontSize="6.5"
        fontWeight="bold"
        fontFamily="system-ui, sans-serif"
      >
        PDF
      </text>
    </svg>
  );
}

export function ExcelIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <path d="M14 2v6h6" />
      <path d="m9 14.5 3 3 3-3" strokeWidth={0} />
      <text
        x="12"
        y="17.5"
        textAnchor="middle"
        stroke="none"
        fill="currentColor"
        fontSize="5.5"
        fontWeight="bold"
        fontFamily="system-ui, sans-serif"
      >
        XLS
      </text>
    </svg>
  );
}
