# frozen_string_literal: true

# Alphabetical sort for displayed labels. Diacritics are ignored at the primary
# level (ã/á/â = a, ç = c, ê = e), which is dictionary order in both English and
# Brazilian Portuguese. Each language still sorts its own wording, so EN and BR
# lists come out in different orders.

module AlphaSort
  module_function

  def sort_key(value)
    text = value.to_s
    folded = text.downcase.unicode_normalize(:nfd).gsub(/\p{M}/, "")
    [folded, text.downcase]
  end

  def sort_alpha(list)
    Array(list).sort_by { |item| sort_key(item) }
  end
end

module AlphaSortFilter
  def sort_alpha(input)
    AlphaSort.sort_alpha(input)
  end
end

Liquid::Template.register_filter(AlphaSortFilter) if defined?(Liquid::Template)
