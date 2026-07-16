import LegalPage from '../../components/LegalPage';
import SiteFooter from '../../components/SiteFooter';
import SiteHeader from '../../components/SiteHeader';

export default function EULAPage() {
  return (
    <>
      <SiteHeader ctaHref="/#waitlist" ctaLabel="Join Waitlist" />
      <LegalPage documentKey="eula" />
      <SiteFooter />
    </>
  );
}
