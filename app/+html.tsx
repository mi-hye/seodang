import { PropsWithChildren } from "react";

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="ko">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />
        <style
          id="expo-reset"
          dangerouslySetInnerHTML={{
            __html: "#root,body,html{height:100%}body{overflow:hidden}#root{display:flex}",
          }}
        />
        <link
          rel="icon"
          href="/favicon-light.png"
          media="(prefers-color-scheme: light)"
        />
        <link
          rel="icon"
          href="/favicon-dark.png"
          media="(prefers-color-scheme: dark)"
        />
        <link rel="icon" href="/favicon-light.png" />
      </head>
      <body>{children}</body>
    </html>
  );
}
