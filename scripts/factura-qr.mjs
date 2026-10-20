import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QRCodeSVG } from "qrcode.react";

const url = process.argv[2];
if (!url) process.exit(1);
process.stdout.write(renderToStaticMarkup(React.createElement(QRCodeSVG, { value: url, size: 128, level: "M", marginSize: 2, xmlns: "http://www.w3.org/2000/svg" })));
