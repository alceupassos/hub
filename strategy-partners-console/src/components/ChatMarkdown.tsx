'use client'
import { useState, type ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Copy, Check } from 'lucide-react'

interface Props {
  content: string
  streaming?: boolean
}

export function ChatMarkdown({ content, streaming }: Props) {
  return (
    <div className="prose-chat">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code(props) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { children, className, node, ref, ...rest } = props
            const match = /language-(\w+)/.exec(className ?? '')
            if (match) {
              return (
                <CodeBlock lang={match[1]}>
                  {String(children).replace(/\n$/, '')}
                </CodeBlock>
              )
            }
            return <code className="inline-code" {...rest}>{children}</code>
          },
        }}
      >
        {content}
      </ReactMarkdown>
      {streaming && <span className="streaming-cursor" />}
    </div>
  )
}

function CodeBlock({ lang, children }: { lang: string; children: string }) {
  const [copied, setCopied] = useState(false)

  const copy = () => {
    navigator.clipboard.writeText(children).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    })
  }

  return (
    <div className="code-block-wrap">
      <div className="code-block-header">
        <span className="code-block-lang">{lang}</span>
        <button onClick={copy} className="code-copy-btn">
          {copied
            ? <><Check size={11} /> Copiado</>
            : <><Copy size={11} /> Copiar</>
          }
        </button>
      </div>
      <SyntaxHighlighter
        language={lang}
        style={oneDark}
        customStyle={{
          margin: 0,
          borderRadius: 0,
          fontSize: '12px',
          lineHeight: '1.6',
          background: '#1e2433',
        }}
        PreTag={({ children }: { children: ReactNode }) => <>{children}</>}
      >
        {children}
      </SyntaxHighlighter>
    </div>
  )
}
