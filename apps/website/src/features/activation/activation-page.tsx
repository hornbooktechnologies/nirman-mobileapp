import Image from "next/image";
import Link from "next/link";
import logo from "@/assets/brand/horizontal-logo.png";
import { ActivationForm } from "./activation-form";
import { getInvitation, invitationError, validToken } from "./service";
import { styles } from "./styles";

export async function ActivationPage({ token }: { token: string }) {
  let invitation;
  let error = "";
  if (!validToken(token))
    error =
      "Open the complete activation link from your invitation email to continue.";
  else {
    try {
      invitation = await getInvitation(token);
    } catch (cause) {
      error = invitationError(cause);
    }
  }
  return (
    <main id="main-content" className={styles.page}>
      <div className={styles.backdrop} aria-hidden="true" />
      <section className={styles.card} aria-label="Account activation">
        <Link className={styles.brand} href="/" aria-label="NirmanSite home">
          <Image src={logo} alt="NirmanSite" height={30} priority className="h-[30px] w-auto" />
        </Link>
        {invitation ? (
          <ActivationForm token={token} invitation={invitation} />
        ) : (
          <div className={styles.stack}>
            <h1>Activate your account</h1>
            <p role="alert">{error}</p>
            {validToken(token) && (
              <a
                className={styles.secondary}
                href={`nirmansite://activate?token=${encodeURIComponent(token)}`}
              >
                Open in installed app
              </a>
            )}
            {validToken(token) && (
              <a
                className={styles.secondary}
                href={`/activate?token=${encodeURIComponent(token)}`}
              >
                Check invitation again
              </a>
            )}
            <Link className={styles.secondary} href="/">
              Back to home
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
