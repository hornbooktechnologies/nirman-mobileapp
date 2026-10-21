import { SITE_DESCRIPTION, SITE_URL } from '@/config/seo'

export default function ProductStructuredData() {
  const organizationId = `${SITE_URL}/#organization`
  const data = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization', '@id': organizationId,
        name: 'Hornbook Technologies', url: `${SITE_URL}/about`,
        email: 'contact@hornbooktechnologies.com',
      },
      {
        '@type': 'WebSite', '@id': `${SITE_URL}/#website`,
        name: 'NirmanSite', url: SITE_URL, inLanguage: 'en',
        publisher: { '@id': organizationId },
      },
      {
        '@type': 'SoftwareApplication', '@id': `${SITE_URL}/#application`,
        name: 'NirmanSite', url: SITE_URL, description: SITE_DESCRIPTION,
        applicationCategory: 'BusinessApplication',
        creator: { '@id': organizationId },
        featureList: ['Labour attendance', 'Worker records and wages', 'Kharchi advance records', 'Site expenses', 'Material requests', 'Construction progress', 'Sales enquiries and follow-ups'],
      },
    ],
  }
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }} />
}
