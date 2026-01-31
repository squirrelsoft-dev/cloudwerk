type MarkdownNode = {
  type: string
  content?: string
  level?: number
  lang?: string
  items?: string[]
  children?: MarkdownNode[]
}

function parseMarkdown(source: string): MarkdownNode[] {
  const lines = source.split('\n')
  const nodes: MarkdownNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Headers
    const headerMatch = line.match(/^(#{1,6})\s+(.+)$/)
    if (headerMatch) {
      nodes.push({
        type: 'heading',
        level: headerMatch[1].length,
        content: headerMatch[2],
      })
      i++
      continue
    }

    // Code blocks
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim()
      const codeLines: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      nodes.push({
        type: 'code',
        lang: lang || undefined,
        content: codeLines.join('\n'),
      })
      i++
      continue
    }

    // Unordered lists
    if (line.match(/^[-*]\s+/)) {
      const items: string[] = []
      while (i < lines.length && lines[i].match(/^[-*]\s+/)) {
        items.push(lines[i].replace(/^[-*]\s+/, ''))
        i++
      }
      nodes.push({ type: 'list', items })
      continue
    }

    // Empty lines
    if (line.trim() === '') {
      i++
      continue
    }

    // Paragraphs
    const paragraphLines: string[] = []
    while (i < lines.length && lines[i].trim() !== '' && !lines[i].match(/^[#\-*`]/)) {
      paragraphLines.push(lines[i])
      i++
    }
    if (paragraphLines.length > 0) {
      nodes.push({ type: 'paragraph', content: paragraphLines.join(' ') })
    }
  }

  return nodes
}

function formatInlineText(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-sm">$1</code>')
}

export function renderMarkdown(source: string): string {
  const nodes = parseMarkdown(source)
  const parts: string[] = []

  for (const node of nodes) {
    switch (node.type) {
      case 'heading': {
        const Tag = `h${node.level}`
        const classes: Record<number, string> = {
          1: 'text-3xl font-bold mt-8 mb-4',
          2: 'text-2xl font-semibold mt-6 mb-3',
          3: 'text-xl font-medium mt-4 mb-2',
        }
        parts.push(
          `<${Tag} class="${classes[node.level!] || 'font-medium mt-4 mb-2'}">${formatInlineText(node.content!)}</${Tag}>`
        )
        break
      }
      case 'paragraph':
        parts.push(
          `<p class="mb-4 leading-relaxed">${formatInlineText(node.content!)}</p>`
        )
        break
      case 'code':
        parts.push(
          `<pre class="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto mb-4"><code${node.lang ? ` class="language-${node.lang}"` : ''}>${escapeHtml(node.content!)}</code></pre>`
        )
        break
      case 'list':
        parts.push('<ul class="list-disc list-inside mb-4 space-y-1">')
        for (const item of node.items!) {
          parts.push(`<li>${formatInlineText(item)}</li>`)
        }
        parts.push('</ul>')
        break
    }
  }

  return parts.join('\n')
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
