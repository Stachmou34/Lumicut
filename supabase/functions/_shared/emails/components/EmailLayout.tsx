import {
  Html, Head, Body, Container, Section, Text, Img, Hr, Link, Preview
} from 'npm:@react-email/components@0.0.22'

interface Props {
  children: React.ReactNode
  preview: string
}

const base = 'https://lumicut.fr'

export function EmailLayout({ children, preview }: Props) {
  return (
    <Html lang="fr">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={body}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Text style={logo}>LumiCut</Text>
            <Text style={tagline}>Panneaux rétroéclairés fabriqués en France</Text>
          </Section>

          <Hr style={divider} />

          {/* Contenu */}
          {children}

          <Hr style={{ ...divider, marginTop: 40 }} />

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              LumiCut — Panneaux décoratifs rétroéclairés fabriqués en France
            </Text>
            <Text style={footerLinks}>
              <Link href={`${base}/contact`} style={footerLink}>Contact</Link>
              {' · '}
              <Link href="https://instagram.com/lumicut" style={footerLink}>Instagram</Link>
              {' · '}
              <Link href={`${base}/cgv`} style={footerLink}>CGV</Link>
              {' · '}
              <Link href={`${base}/mentions-legales`} style={footerLink}>Mentions légales</Link>
            </Text>
            <Text style={footerSmall}>
              Vous recevez cet email car vous avez passé commande sur lumicut.fr.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

const body = {
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  backgroundColor: '#f1f5f9',
  margin: 0,
  padding: '20px 0',
}

const container = {
  maxWidth: '600px',
  margin: '0 auto',
  backgroundColor: '#ffffff',
  borderRadius: '12px',
  overflow: 'hidden',
  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
}

const header = {
  backgroundColor: '#020617',
  padding: '28px 40px',
  textAlign: 'center' as const,
}

const logo = {
  color: '#fbbf24',
  fontSize: '24px',
  fontWeight: '900',
  letterSpacing: '-0.5px',
  margin: 0,
}

const tagline = {
  color: '#64748b',
  fontSize: '12px',
  margin: '4px 0 0',
}

const divider = {
  borderColor: '#e2e8f0',
  margin: '0',
}

const footer = {
  padding: '24px 40px',
  textAlign: 'center' as const,
  backgroundColor: '#f8fafc',
}

const footerText = {
  color: '#94a3b8',
  fontSize: '12px',
  margin: '0 0 8px',
}

const footerLinks = {
  color: '#94a3b8',
  fontSize: '12px',
  margin: '0 0 8px',
}

const footerLink = {
  color: '#64748b',
  textDecoration: 'underline',
}

const footerSmall = {
  color: '#cbd5e1',
  fontSize: '11px',
  margin: 0,
}
