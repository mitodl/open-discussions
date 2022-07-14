// @flow
/* global SETTINGS */
import React from "react"
import { MetaTags } from "react-meta-tags"

import { Card } from "ol-util" 
import { CanonicalLink } from "ol-util"
import PoliciesNavBar from "../../components/PoliciesNavBar"
import withSingleColumn from "../../hoc/withSingleColumn"

import { formatTitle } from "../../lib/title"

import type { Match } from "react-router"

type Props = {
  match: Match
}

const PrivacyPolicyPage = ({ match }: Props) => (
  <React.Fragment>
    <MetaTags>
      <title>{formatTitle("Privacy Statement")}</title>
      <CanonicalLink match={match} />
    </MetaTags>
    <PoliciesNavBar />
    <div className="main-content">
      <Card className="site-policy privacy-statement">
        <h1>Privacy Statement</h1>
        <h4>Introduction</h4>
        <p>
          MIT Open is committed to supporting the privacy of MIT Open members.
          This Privacy Statement explains how we handle and use the personal
          information we collect about users of the web site.
        </p>
        <h4>What personal information we collect</h4>
        <p>
          While specific information may vary for particular individuals, we may
          collect, use, store and transfer different kinds of personal
          information about you, which we have grouped together as follows:
        </p>
        <ul>
          <li>
            For members of MIT Open, we collect basic biographic/contact
            information – name, email addresses, and social media contact
            information
          </li>
          <li>
            For all users of MIT Open, we collect aggregated information related
            to web visitor activity and email marketing actions
          </li>
        </ul>
        <h4>How we collect personal information about you</h4>
        <p>
          We collect personal information only when you share it with us, and
          when you use the MIT Open web site.
        </p>
        <h4>How we use your personal information</h4>
        <p>
          We use your personal information for a number of legitimate purposes
          all in support of the Institute and its mission. Specifically, we use
          your personal information to:
        </p>
        <ul>
          <li>
            We share your name, headline and biography with other users of MIT
            Open, when you submit posts, or comment on posts.
          </li>
          <li>
            We collect information about your use of the site in order to make
            content recommendations to you.
          </li>
        </ul>
        <p>
          If you have concerns about any of these purposes, or how we
          communicate with you, please contact us at{" "}
          <a href={`mailto:${SETTINGS.support_email}`}>
            {SETTINGS.support_email}
          </a>
          . We will always respect a request by you to stop processing your
          personal information (subject to our legal obligations).
        </p>
        <h4>When we share your personal information</h4>
        <p>
          To perform the functions listed above, it may be necessary to share
          your personal information with third parties and vendors under
          contract with us.
        </p>
        <h4>How your information is stored and secured</h4>
        <p>
          MIT uses risk-assessed administrative, technical and physical security
          measures to protect your personal information. Only authenticated
          users with specific permissions may access the data. We use firewalls
          and regular monitoring to evaluate any attempts at accessing the
          systems without permission.
        </p>
        <h4>How long we keep your personal information</h4>
        <p>
          We consider our relationship with MIT Open members to be lifelong.
          This means that we will maintain a record for you until such time as
          you tell us that you no longer wish us to keep in touch. If you no
          longer wish to hear from MIT Open, we will retain a core set of
          information about you to fulfill administrative tasks and legal
          obligations.
        </p>
        <h4>Rights for Individuals in the European Economic Area</h4>
        <p>
          You have the right in certain circumstances to (1) access your
          personal information; (2) to correct or erase information; (3)
          restrict processing; and (4) object to communications, direct
          marketing, or profiling. To the extent applicable, the EU’s General
          Data Protection Regulation provides further information about your
          rights. You also have the right to lodge complaints with your national
          or regional data protection authority.
        </p>
        <p>
          If you are inclined to exercise these rights, we request an
          opportunity to discuss with you any concerns you may have. To protect
          the personal information we hold, we may also request further
          information to verify your identify when exercising these rights. Upon
          a request to erase information, we will maintain a core set of
          personal data to ensure we do not contact you inadvertently in the
          future, as well as any information necessary for MIT archival
          purposes. We may also need to retain some financial information for
          legal purposes, including US IRS compliance. In the event of an actual
          or threatened legal claim, we may retain your information for purposes
          of establishing, defending against or exercising our rights with
          respect to such claim.
        </p>
        <p>
          By providing information directly to MIT, you consent to the transfer
          of your personal information outside of the European Economic Area to
          the United States. You understand that the current laws and
          regulations of the United States may not provide the same level of
          protection as the data and privacy laws and regulations of the EEA.
        </p>
        <p>
          You are under no statutory or contractual obligation to provide any
          personal data to us.
        </p>
        <h4>Additional Information</h4>
        <p>
          We may change this Privacy Statement from time to time. If we make any
          significant changes in the way we treat your personal information we
          will make this clear on our MIT websites or by contacting you
          directly.
        </p>
        <p>
          The controller for your personal information is MIT. If you are in the
          EU and wish to assert any of your applicable GDPR rights, please
          contact dataprotection@mit.edu.
        </p>
        <p className="policy-update-notice">
          This policy was last updated in AUGUST 2018.
        </p>
      </Card>
    </div>
  </React.Fragment>
)
export default withSingleColumn("", PrivacyPolicyPage)
