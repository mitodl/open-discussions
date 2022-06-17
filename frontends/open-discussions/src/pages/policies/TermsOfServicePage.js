// @flow
import React from "react"
import { MetaTags } from "react-meta-tags"

import Card from "../../components/Card"
import CanonicalLink from "../../components/CanonicalLink"
import PoliciesNavBar from "../../components/PoliciesNavBar"
import withSingleColumn from "../../hoc/withSingleColumn"

import { formatTitle } from "../../lib/title"

import type { Match } from "react-router"

type Props = {
  match: Match
}

const TermsOfServicePage = ({ match }: Props) => (
  <React.Fragment>
    <MetaTags>
      <title>{formatTitle("Terms & Conditions")}</title>
      <CanonicalLink match={match} />
    </MetaTags>
    <PoliciesNavBar />
    <div className="main-content">
      <Card className="site-policy terms-of-service">
        <h1>Terms & Conditions</h1>
        <p>
          Welcome to the MIT OPEN website (the “Site”). By accessing this Site,
          users agree to be bound by the following terms and conditions which
          MIT may revise at any time. Users are encouraged to visit this page
          periodically to review current terms and conditions, as your continued
          use of this Site signifies your agreement to these term and
          conditions. If you do not understand or do not agree to be bound by
          these terms and conditions, please exit this Site immediately.
        </p>
        <ol>
          <li>
            Your use of this Site is entirely voluntary. This Site is designed
            to assist and facilitate your access to MIT OPEN materials and the
            MIT OPEN community. These terms and conditions govern your use of
            this Site alone.
          </li>
          <li>
            MIT respects your privacy. We do not collect personally identifiable
            information about you unless you voluntarily provide it. Our primary
            aim in collecting personally identifiable information is to provide
            you with the best educational experience possible. By "personally
            identifiable information," we are referring to (1) data that
            uniquely identifies you or permits us to contact you, such as your
            name, email address, mailing address, phone number; and (2) other
            information that we collect through the Site and combine and
            maintain in combination with that personally identifiable
            information, such as your area of interest; educational and
            employment background; Among other things, MIT may use the
            personally identifiable information that you provide to respond to
            your questions; provide you the specific courses and/or services you
            select; send you updates about courses and information, including
            specifically the MIT educational programs and information about MIT
            events; send you information about Site maintenance or updates; and
            for all appropriate MIT administrative and research purposes. Except
            as set forth herein or as specifically agreed to by you, MIT will
            not disclose any personally identifiable information we gather from
            you on the Site to any third parties.
          </li>
          <li>
            Comments or other information posted by you to our forums, boards or
            other areas of the Site designed for public communications or
            communications among class members may be viewed and downloaded by
            others and are available to MIT faculty and staff for research and
            administrative purposes. For this reason, we encourage you to use
            discretion when deciding to post in these forums.
          </li>
          <li>
            You agree to use the Site in accordance with all applicable laws.
            You are responsible for your own communications, including the
            upload, transmission and posting of information, and are responsible
            for the consequences of their posting on or through the Site. You
            further agree that you will not email or post malicious or harmful
            content anywhere on the Site, or on any other MIT computing
            resources including without limitation the following:
            <ul>
              <li>Content that defames or threatens others.</li>
              <li>
                Harassing statements or content that violates federal or state
                law.
              </li>
              <li>
                Content that discusses illegal activities with the intent to
                commit them.
              </li>
              <li>
                Content that is not your own, or infringes another’s
                intellectual property including, but not limited to, copyrights,
                trademarks or trade secrets.
              </li>
              <li>
                Material that contains obscene (i.e. pornographic) language or
                images.
              </li>
              <li>
                Advertising or any form of commercial solicitation or promotion,
                including links to other sites.
              </li>
              <li>Content that is otherwise unlawful.</li>
              <li>
                Intentionally incomplete, misleading or inaccurate content.
              </li>
            </ul>
          </li>
          <li>
            "MIT", "Massachusetts Institute of Technology", and its logos and
            seal are trademarks of the Massachusetts Institute of Technology.
            Except for purposes of attribution, you may not use MIT’s names or
            logos, or any variations thereof, without prior written consent of
            MIT. You may not use the MIT name in any of its forms nor MIT seals
            or logos for promotional purposes, or in any way that deliberately
            or inadvertently claims, suggests, or in MIT’s sole judgment gives
            the appearance or impression of a relationship with or endorsement
            by MIT.
          </li>
          <li>
            NEITHER MIT, ITS AFFILIATES, TRUSTEES, DIRECTORS, OFFICERS,
            EMPLOYEES AND AGENTS SHALL HAVE ANY LIABILITY FOR ANY DAMAGES,
            INCLUDING WITHOUT LIMITATION, ANY DIRECT, INDIRECT, INCIDENTAL,
            COMPENSATORY, PUNITIVE, SPECIAL OR CONSEQUENTIAL DAMAGES (EVEN IF
            MIT HAS BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES) ARISING
            FROM OR RELATED TO THE USE OF THE SITE, CONTENT, AND/OR COMPILATION.
          </li>
          <li>
            You agree to defend, hold harmless and indemnify MIT, and its
            subsidiaries, affiliates, officers, agents, and employees from and
            against any third-party claims, actions or demands arising out of,
            resulting from or in any way related to your use of the Site,
            including any liability or expense arising from any and all claims,
            losses, damages (actual and consequential), suits, judgments,
            litigation costs and attorneys’ fees, of every kind and nature. In
            such a case, MIT will provide you with written notice of such claim,
            suit or action.
          </li>
          <li>
            These terms and conditions constitute the entire agreement between
            you and MIT with respect to your use of the Site, superseding any
            prior agreements between you and MIT regarding your use of the Site.
            The failure of MIT to exercise or enforce any right or provision of
            the terms and conditions shall not constitute a waiver of such right
            or provision. If any provision of the terms and conditions is found
            by a court of competent jurisdiction to be invalid, the parties
            nevertheless agree that the court should endeavor to give effect to
            the parties’ intentions as reflected in the provision, and the other
            provisions of the terms and conditions remain in full force and
            effect.
          </li>
          <li>
            You agree that any dispute arising out of or relating to these terms
            and conditions or any content posted to a Site will be governed by
            the laws of the Commonwealth of Massachusetts, excluding its
            conflicts of law provisions. You further consent to the personal
            jurisdiction of and exclusive venue in the federal and state courts
            located in and serving Boston, Massachusetts as the legal forum for
            any such dispute.
          </li>
        </ol>
      </Card>
    </div>
  </React.Fragment>
)
export default withSingleColumn("", TermsOfServicePage)
