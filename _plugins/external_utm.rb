# frozen_string_literal: true

# Appends utm_source=victordepaiva.com to outbound <a href> URLs in rendered HTML.
# Internal paths and this site's own hosts are left unchanged. Existing utm_source
# values are kept once (duplicates are collapsed) so source files can include or
# omit the tag without producing ?utm_source=...?utm_source=...

require "uri"

module ExternalUtm
  PARAM_KEY = "utm_source"
  PARAM_VALUE = "victordepaiva.com"
  PARAM = "#{PARAM_KEY}=#{PARAM_VALUE}"
  A_HREF_REGEX = /(<a\b[^>]*?\bhref\s*=\s*)(["'])(.*?)\2/im
  SKIP_SCHEMES = %w[mailto tel javascript data blob sms whatsapp].freeze
  LOCAL_HOSTS = %w[localhost 127.0.0.1 ::1].freeze

  module_function

  def rewrite_html(html)
    return html if html.nil? || html.empty?

    html.gsub(A_HREF_REGEX) do
      prefix = Regexp.last_match(1)
      quote = Regexp.last_match(2)
      href = Regexp.last_match(3)
      "#{prefix}#{quote}#{rewrite_href(href)}#{quote}"
    end
  end

  def rewrite_href(href)
    return href if href.nil?

    raw = href.strip
    return href if raw.empty?
    return href if skip_href?(raw)
    return href unless outbound_http?(raw)

    tagged = apply_utm(raw)
    original_used_entities = href.include?("&amp;")
    tagged = tagged.gsub("&", "&amp;") if original_used_entities || tagged.include?("&")
    tagged
  end

  def skip_href?(href)
    return false if href.start_with?("//")
    return true if href.start_with?("#", "/", "?", ".")
    scheme = href[/\A([a-zA-Z][a-zA-Z0-9+.-]*):/, 1]
    scheme && SKIP_SCHEMES.include?(scheme.downcase)
  end

  def outbound_http?(href)
    return false unless href.match?(%r{\Ahttps?://}i) || href.match?(%r{\A//[A-Za-z0-9]})

    host = host_for(href)
    return false if host.nil? || host.empty?
    !internal_host?(host)
  end

  def host_for(href)
    candidate = href.start_with?("//") ? "https:#{href}" : href
    URI.parse(candidate).host
  rescue URI::InvalidURIError
    href[%r{\A(?:https?:)?//([^/?#]+)}i, 1]
  end

  def internal_host?(host)
    normalized = host.to_s.downcase
    normalized = normalized.delete_prefix("[")
    normalized = normalized.delete_suffix("]")
    hostname = normalized.sub(/:\d+\z/, "")
    hostname = hostname.delete_prefix("www.")

    return true if LOCAL_HOSTS.include?(hostname)
    hostname == "victordepaiva.com" || hostname.end_with?(".victordepaiva.com")
  end

  def apply_utm(href)
    decoded = href.gsub("&amp;", "&")
    hash_index = decoded.index("#")
    hash = hash_index ? decoded[hash_index..] : ""
    without_hash = hash_index ? decoded[0...hash_index] : decoded

    query_index = without_hash.index("?")
    base = query_index ? without_hash[0...query_index] : without_hash
    query = query_index ? without_hash[(query_index + 1)..] : ""

    parts = query.split(/[&?]/)
    kept = []
    saw_utm = false
    parts.each do |part|
      next if part.nil? || part.empty?

      if part.match?(/\A#{PARAM_KEY}=/i)
        next if saw_utm

        saw_utm = true
        kept << PARAM
      else
        kept << part
      end
    end
    kept << PARAM unless saw_utm

    "#{base}?#{kept.join('&')}#{hash}"
  end

  def each_html_item(site)
    items = site.pages.dup
    site.collections.each_value { |collection| items.concat(collection.docs) }
    items.each do |item|
      next unless item.respond_to?(:output) && item.output

      yield item
    end
  end

  def rewrite_item(item)
    return unless item.output.to_s.include?("<a")

    item.output = rewrite_html(item.output)
  end

  def rewrite_destination(dest)
    Dir.glob(File.join(dest, "**", "*.{html,htm}")).each do |path|
      original = File.read(path, encoding: "UTF-8")
      updated = rewrite_html(original)
      File.write(path, updated, encoding: "UTF-8") if updated != original
    end
  end
end

if defined?(Jekyll)
  Jekyll::Hooks.register :site, :post_render do |site|
    ExternalUtm.each_html_item(site) { |item| ExternalUtm.rewrite_item(item) }
  end

  Jekyll::Hooks.register :site, :post_write do |site|
    ExternalUtm.rewrite_destination(site.dest)
  end
end

if $PROGRAM_NAME == __FILE__
  failures = 0
  examples = {
    "https://www.spawnd.gg/" => "https://www.spawnd.gg/?utm_source=victordepaiva.com",
    "https://www.spawnd.gg/?utm_source=victordepaiva.com" => "https://www.spawnd.gg/?utm_source=victordepaiva.com",
    "https://www.spawnd.gg/?utm_source=victordepaiva.com?utm_source=victordepaiva.com" => "https://www.spawnd.gg/?utm_source=victordepaiva.com",
    "https://example.com/path?foo=1#hash" => "https://example.com/path?foo=1&amp;utm_source=victordepaiva.com#hash",
    "https://www.nuuvem.com/-/item/cartomante-fortune-teller?utm_source=victordepaiva.com" => "https://www.nuuvem.com/-/item/cartomante-fortune-teller?utm_source=victordepaiva.com",
    "/about" => "/about",
    "/games/rhythmania" => "/games/rhythmania",
    "https://victordepaiva.com/about/" => "https://victordepaiva.com/about/",
    "https://www.victordepaiva.com/links/" => "https://www.victordepaiva.com/links/",
    "mailto:contato@garoastudios.com" => "mailto:contato@garoastudios.com",
    "#" => "#",
    "https://garoastudios.com?utm_source=victordepaiva.com" => "https://garoastudios.com?utm_source=victordepaiva.com",
    "//example.com/x" => "//example.com/x?utm_source=victordepaiva.com"
  }

  examples.each do |input, expected|
    actual = ExternalUtm.rewrite_href(input)
    next if actual == expected

    failures += 1
    warn "rewrite_href #{input.inspect}\n  expected #{expected.inspect}\n  actual   #{actual.inspect}"
  end

  html = ExternalUtm.rewrite_html('<a href="https://nuuvem.com">Nuuvem</a> <a href="/now/">now</a>')
  expected_html = '<a href="https://nuuvem.com?utm_source=victordepaiva.com">Nuuvem</a> <a href="/now/">now</a>'
  unless html == expected_html
    failures += 1
    warn "rewrite_html failed:\n  expected #{expected_html.inspect}\n  actual   #{html.inspect}"
  end

  html = ExternalUtm.rewrite_html(html)
  unless html == expected_html
    failures += 1
    warn "rewrite_html is not idempotent:\n  expected #{expected_html.inspect}\n  actual   #{html.inspect}"
  end

  raise "#{failures} ExternalUtm checks failed" unless failures.zero?

  puts "ExternalUtm checks passed"
end
