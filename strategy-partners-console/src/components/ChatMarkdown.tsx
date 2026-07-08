'use client'
import { Children, Fragment, useState, type ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Copy, Check } from 'lucide-react'

interface Props {
  content: string
  streaming?: boolean
  // Quando fornecido, marcadores de citação [n] no texto viram âncoras clicáveis
  // que chamam onCiteClick(n) — usado pelo chat do deal para abrir a fonte citada.
  onCiteClick?: (n: number) => void
}

// Substitui marcadores [n] (n numérico) em nós de texto por superscritos clicáveis.
// Só toca em children que são strings — elementos (código inline, negrito, etc.) passam intactos,
// então blocos de código e tabelas nunca são afetados.
function linkifyCitations(children: ReactNode, onCiteClick: (n: number) => void): ReactNode {
  return Children.map(children, child => {
    if (typeof child !== 'string') return child
    const parts = child.split(/(\[\d+\])/g)
    if (parts.length === 1) return child
    return parts.map((part, i) => {
      const m = /^\[(\d+)\]$/.exec(part)
      if (!m) return <Fragment key={i}>{part}</Fragment>
      const n = Number(m[1])
      return (
        <button
          key={i}
          type="button"
          onClick={() => onCiteClick(n)}
          className="cite-marker align-super text-[0.7em] font-semibold text-accent hover:underline cursor-pointer"
          title={`Ver fonte [${n}]`}
        >
          [{n}]
        </button>
      )
    })
  })
}

export function ChatMarkdown({ content, streaming, onCiteClick }: Props) {
  const cite = onCiteClick
    ? (children: ReactNode) => linkifyCitations(children, onCiteClick)
    : (children: ReactNode) => children
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
          p({ children }) {
            return <p>{cite(children)}</p>
          },
          li({ children }) {
            return <li>{cite(children)}</li>
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
