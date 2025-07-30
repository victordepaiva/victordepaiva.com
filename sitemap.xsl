<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="2.0" 
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                xmlns:sitemap="http://www.sitemaps.org/schemas/sitemap/0.9">
  <xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes"/>
  
  <xsl:template match="/">
    <html lang="en">
      <head>
        <title>XML Sitemap - Victor de Paiva</title>
        <meta charset="UTF-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
          }
          .container {
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            padding: 30px;
          }
          h1 {
            color: #2c3e50;
            border-bottom: 3px solid #3498db;
            padding-bottom: 10px;
            margin-bottom: 30px;
          }
          .stats {
            background: #ecf0f1;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 30px;
            display: flex;
            justify-content: space-between;
            flex-wrap: wrap;
          }
          .stat {
            text-align: center;
            min-width: 120px;
          }
          .stat-number {
            font-size: 2em;
            font-weight: bold;
            color: #3498db;
          }
          .stat-label {
            font-size: 0.9em;
            color: #7f8c8d;
            text-transform: uppercase;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
          }
          th {
            background: #3498db;
            color: white;
            padding: 12px;
            text-align: left;
            font-weight: 600;
          }
          td {
            padding: 12px;
            border-bottom: 1px solid #ecf0f1;
          }
          tr:hover {
            background-color: #f8f9fa;
          }
          .url {
            color: #2980b9;
            text-decoration: none;
            font-weight: 500;
          }
          .url:hover {
            text-decoration: underline;
          }
          .date {
            color: #7f8c8d;
            font-size: 0.9em;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #ecf0f1;
            text-align: center;
            color: #7f8c8d;
            font-size: 0.9em;
          }
          @media (max-width: 768px) {
            .stats {
              flex-direction: column;
              gap: 15px;
            }
            .stat {
              min-width: auto;
            }
            table {
              font-size: 0.9em;
            }
            th, td {
              padding: 8px;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>XML Sitemap - Victor de Paiva</h1>
          
          <div class="stats">
            <div class="stat">
              <div class="stat-number">
                <xsl:value-of select="count(sitemap:urlset/sitemap:url)"/>
              </div>
              <div class="stat-label">Total Pages</div>
            </div>
            <div class="stat">
              <div class="stat-number">
                <xsl:value-of select="count(sitemap:urlset/sitemap:url[sitemap:lastmod])"/>
              </div>
              <div class="stat-label">With Dates</div>
            </div>
            <div class="stat">
              <div class="stat-number">
                <xsl:value-of select="count(sitemap:urlset/sitemap:url[contains(sitemap:loc, '/fiction/')])"/>
              </div>
              <div class="stat-label">Fiction</div>
            </div>
            <div class="stat">
              <div class="stat-number">
                <xsl:value-of select="count(sitemap:urlset/sitemap:url[contains(sitemap:loc, '/games/')])"/>
              </div>
              <div class="stat-label">Games</div>
            </div>
            <div class="stat">
              <div class="stat-number">
                <xsl:value-of select="count(sitemap:urlset/sitemap:url[contains(sitemap:loc, '/nonfiction/')])"/>
              </div>
              <div class="stat-label">Non-fiction</div>
            </div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>URL</th>
                <th>Last Modified</th>
                <th>Type</th>
              </tr>
            </thead>
            <tbody>
              <xsl:for-each select="sitemap:urlset/sitemap:url">
                <xsl:sort select="sitemap:lastmod" order="descending"/>
                <tr>
                  <td>
                    <a href="{sitemap:loc}" class="url">
                      <xsl:value-of select="sitemap:loc"/>
                    </a>
                  </td>
                  <td class="date">
                    <xsl:choose>
                      <xsl:when test="sitemap:lastmod">
                        <xsl:value-of select="sitemap:lastmod"/>
                      </xsl:when>
                      <xsl:otherwise>No date</xsl:otherwise>
                    </xsl:choose>
                  </td>
                  <td>
                    <xsl:choose>
                      <xsl:when test="contains(sitemap:loc, '/fiction/')">Fiction</xsl:when>
                      <xsl:when test="contains(sitemap:loc, '/games/')">Games</xsl:when>
                      <xsl:when test="contains(sitemap:loc, '/nonfiction/')">Non-fiction</xsl:when>
                      <xsl:when test="sitemap:loc = 'http://localhost:4000/'">Homepage</xsl:when>
                      <xsl:otherwise>Page</xsl:otherwise>
                    </xsl:choose>
                  </td>
                </tr>
              </xsl:for-each>
            </tbody>
          </table>
          
          <div class="footer">
            <p>Generated by Jekyll | Custom sitemap excludes drafts</p>
            <p>Last updated: <xsl:value-of select="current-dateTime()"/></p>
          </div>
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet> 