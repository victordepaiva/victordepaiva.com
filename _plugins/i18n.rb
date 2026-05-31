# frozen_string_literal: true

require "json"

module VictorSiteI18n
  module_function

  def config(site)
    site.config.fetch("i18n", {})
  end

  def locales(site)
    config(site).fetch("locales", []).map { |locale| locale.fetch("code") }
  end

  def default_locale(site)
    config(site).fetch("default_locale", "en")
  end

  def all_entries(site)
    docs = site.collections.values.flat_map(&:docs)
    (site.pages + docs).reject { |entry| entry.data["i18n_fallback"] }
  end

  def key_for(entry)
    data_for(entry)["translation_key"]
  end

  def data_for(entry)
    return entry.data if entry.respond_to?(:data)

    if entry.respond_to?(:[])
      return {
        "translation_key" => entry["translation_key"],
        "lang" => entry["lang"],
        "i18n_path" => entry["i18n_path"],
        "i18n_fallback" => entry["i18n_fallback"]
      }
    end

    {}
  end

  def url_for(entry)
    return entry.url if entry.respond_to?(:url)
    return entry["url"] if entry.respond_to?(:[])

    "/"
  end

  def i18n_path_for(entry)
    configured_path = data_for(entry)["i18n_path"]
    return normalize_path(configured_path) if configured_path && !configured_path.empty?

    url = normalize_path(url_for(entry))
    locale_match = url.match(%r{\A/([a-z]{2})(/.*)\z})
    return normalize_path(locale_match[2]) if locale_match

    url
  end

  def normalize_path(path)
    path = "/#{path}" unless path.start_with?("/")
    path = "#{path}/" unless path.end_with?("/") || File.extname(path) != ""
    path
  end

  def groups(site)
    @groups ||= {}
    cache_key = site.source
    @groups[cache_key] ||= all_entries(site)
      .select { |entry| key_for(entry) && entry.data["lang"] }
      .group_by { |entry| key_for(entry) }
  end

  def entries_for(site, entry)
    key = key_for(entry)
    return [] unless key

    groups(site).fetch(key, [])
  end

  def best_entry(site, entries, requested_locale)
    entries = entries.compact
    return nil if entries.empty?

    by_lang = entries.each_with_object({}) do |entry, memo|
      memo[entry.data["lang"]] ||= entry
    end

    return by_lang[requested_locale] if by_lang[requested_locale]
    return entries.first if entries.size == 1
    return by_lang[default_locale(site)] if by_lang[default_locale(site)]

    entries.first
  end

  def available_urls(site, entry)
    entries_for(site, entry).each_with_object({}) do |translated_entry, memo|
      lang = translated_entry.data["lang"]
      memo[lang] = translated_entry.url if lang
    end
  end

  def url_for_locale(site, entry, locale)
    translations = entries_for(site, entry)
    return url_for(entry) if translations.empty?

    by_lang = translations.each_with_object({}) do |translated_entry, memo|
      memo[translated_entry.data["lang"]] ||= translated_entry
    end

    return url_for(by_lang[locale]) if by_lang[locale]
    return "/#{locale}/#{i18n_path_for(entry).sub(%r{\A/}, "")}" if locales(site).include?(locale)

    best = best_entry(site, translations, locale)
    best ? url_for(best) : url_for(entry)
  end

  def redirect_html(target_url, available_urls = nil)
    available_json = JSON.generate(available_urls || {})
    fallback = target_url || "/"

    <<~HTML
      <!doctype html>
      <html lang="en">
        <head>
          <meta charset="utf-8">
          <meta name="robots" content="noindex, follow">
          <meta http-equiv="refresh" content="0; url=#{fallback}">
          <link rel="canonical" href="#{fallback}">
          <title>Redirecting...</title>
          <script>
            (function () {
              var available = #{available_json};
              var fallback = #{JSON.generate(fallback)};
              function normalize(locale) {
                locale = (locale || '').toLowerCase();
                if (locale.indexOf('pt') === 0) return 'br';
                if (locale.indexOf('en') === 0) return 'en';
                return locale.split('-')[0];
              }
              function choose(preferred) {
                var keys = Object.keys(available);
                var locale = normalize(preferred);
                if (available[locale]) return available[locale];
                if (keys.length === 1) return available[keys[0]];
                if (available.en) return available.en;
                return keys.length ? available[keys[0]] : fallback;
              }
              var saved = window.localStorage && localStorage.getItem('localePreference');
              var browser = (navigator.languages && navigator.languages[0]) || navigator.language || '';
              window.location.replace(choose(saved || browser));
            }());
          </script>
        </head>
        <body>
          <p>Redirecting to <a href="#{fallback}">#{fallback}</a>.</p>
        </body>
      </html>
    HTML
  end

  class GeneratedPage < Jekyll::PageWithoutAFile
    def initialize(site, dir, name, data, content)
      super(site, site.source, dir, name)
      self.data = data
      self.content = content
    end
  end

  class FallbackGenerator < Jekyll::Generator
    safe true
    priority :low

    def generate(site)
      supported_locales = VictorSiteI18n.locales(site)
      return if supported_locales.empty?

      VictorSiteI18n.groups(site).each_value do |entries|
        sample = entries.first
        i18n_path = VictorSiteI18n.i18n_path_for(sample)
        available_urls = entries.each_with_object({}) do |entry, memo|
          memo[entry.data["lang"]] = entry.url
        end

        default_target = VictorSiteI18n.best_entry(site, entries, VictorSiteI18n.default_locale(site))&.url
        add_resolver(site, i18n_path, available_urls, default_target)
        add_resolver(site, File.join("-", i18n_path), available_urls, default_target)

        supported_locales.each do |locale|
          next if available_urls[locale]

          fallback_entry = VictorSiteI18n.best_entry(site, entries, locale)
          add_locale_shell(site, File.join(locale, i18n_path), fallback_entry, locale)
        end
      end
    end

    private

    def add_resolver(site, path, available_urls, target_url)
      add_page(site, path, target_url, available_urls)
    end

    def add_locale_shell(site, path, fallback_entry, locale)
      normalized = VictorSiteI18n.normalize_path(path)
      return if site.pages.any? { |page| VictorSiteI18n.normalize_path(page.url) == normalized }
      return unless fallback_entry

      dir = normalized.sub(%r{\A/}, "").sub(%r{/index\.html\z}, "").sub(%r{/\z}, "")
      fallback_lang = fallback_entry.data["lang"]
      data = fallback_entry.data.dup
      data.delete("permalink")
      data.merge!(
        "lang" => locale,
        "content_lang" => fallback_lang,
        "content_url" => fallback_entry.url,
        "canonical_url" => fallback_entry.url,
        "i18n_fallback" => true,
        "sitemap" => false
      )

      site.pages << GeneratedPage.new(site, dir, "index.html", data, fallback_entry.content)
    end

    def add_page(site, path, target_url, available_urls, fixed: false)
      normalized = VictorSiteI18n.normalize_path(path)
      return if site.pages.any? { |page| VictorSiteI18n.normalize_path(page.url) == normalized }

      dir = normalized.sub(%r{\A/}, "").sub(%r{/index\.html\z}, "").sub(%r{/\z}, "")
      content = fixed ? VictorSiteI18n.redirect_html(target_url, {}) : VictorSiteI18n.redirect_html(target_url, available_urls)
      data = {
        "layout" => nil,
        "sitemap" => false,
        "i18n_fallback" => true
      }

      site.pages << GeneratedPage.new(site, dir, "index.html", data, content)
    end
  end

  module Filters
    def i18n_best(input, requested_locale)
      site = @context.registers[:site]
      groups = Array(input).compact.group_by { |entry| VictorSiteI18n.key_for(entry) || entry.url }

      groups.values.map do |entries|
        VictorSiteI18n.best_entry(site, entries, requested_locale)
      end.compact
    end

    def i18n_url_for_locale(entry, requested_locale)
      site = @context.registers[:site]
      VictorSiteI18n.url_for_locale(site, entry, requested_locale)
    end

    def i18n_available_urls(entry)
      site = @context.registers[:site]
      JSON.generate(VictorSiteI18n.available_urls(site, entry))
    end

    def i18n_path(entry)
      VictorSiteI18n.i18n_path_for(entry)
    end
  end
end

Liquid::Template.register_filter(VictorSiteI18n::Filters)

Jekyll::Hooks.register :site, :post_read do |site|
  VictorSiteI18n::FallbackGenerator.new.generate(site)
end
