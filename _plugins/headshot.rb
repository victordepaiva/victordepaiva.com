# frozen_string_literal: true

# Drop-in headshot. When assets/images/victor-de-paiva.jpg exists, use it as:
# - site.headshot_image (Person JSON-LD image)
# - site.og_image, unless a default is already configured
# - site.author.avatar, unless one is already configured
# Until the file is in the repo, those fields stay blank so nothing 404s.
# Avatar alt text is the author name in _includes/author-profile.html.

Jekyll::Hooks.register :site, :post_read do |site|
  relative = "/assets/images/victor-de-paiva.jpg"
  absolute = File.join(site.source, "assets", "images", "victor-de-paiva.jpg")
  next unless File.file?(absolute)

  site.config["headshot_image"] = relative

  og_image = site.config["og_image"]
  site.config["og_image"] = relative if og_image.nil? || og_image.to_s.strip.empty?

  author = site.config["author"]
  next unless author.is_a?(Hash)

  avatar = author["avatar"]
  author["avatar"] = relative if avatar.nil? || avatar.to_s.strip.empty?
end
