/**
 * @cloudwerk/utils - HTML Utilities Tests
 *
 * Tests for HTML escape utilities.
 */

import { describe, it, expect } from 'vitest'
import { escapeHtmlAttribute } from '../html.js'

describe('escapeHtmlAttribute', () => {
  it('should escape double quotes', () => {
    expect(escapeHtmlAttribute('Hello "World"')).toBe('Hello &quot;World&quot;')
  })

  it('should escape single quotes', () => {
    expect(escapeHtmlAttribute("Hello 'World'")).toBe('Hello &#39;World&#39;')
  })

  it('should escape ampersands', () => {
    expect(escapeHtmlAttribute('Tom & Jerry')).toBe('Tom &amp; Jerry')
  })

  it('should escape less than signs', () => {
    expect(escapeHtmlAttribute('<script>')).toBe('&lt;script&gt;')
  })

  it('should escape greater than signs', () => {
    expect(escapeHtmlAttribute('1 > 0')).toBe('1 &gt; 0')
  })

  it('should escape all special characters together', () => {
    expect(escapeHtmlAttribute('<div class="test" data-value=\'foo & bar\'>')).toBe(
      '&lt;div class=&quot;test&quot; data-value=&#39;foo &amp; bar&#39;&gt;'
    )
  })

  it('should handle empty strings', () => {
    expect(escapeHtmlAttribute('')).toBe('')
  })

  it('should not modify strings without special characters', () => {
    expect(escapeHtmlAttribute('Hello World')).toBe('Hello World')
  })

  it('should handle JSON strings', () => {
    const json = '{"count":0,"name":"John"}'
    expect(escapeHtmlAttribute(json)).toBe('{&quot;count&quot;:0,&quot;name&quot;:&quot;John&quot;}')
  })

  it('should handle strings with multiple occurrences', () => {
    expect(escapeHtmlAttribute('<<<>>>')).toBe('&lt;&lt;&lt;&gt;&gt;&gt;')
  })
})
