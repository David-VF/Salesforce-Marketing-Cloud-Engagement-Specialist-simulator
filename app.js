// ============================================================
// Marketing Cloud Engagement Specialist Exam Simulator — Core Application Logic
// Dual-Shuffle Engine: Fisher-Yates global + per-question option shuffle
// ============================================================

"use strict";

// ---------- Category Constants ----------
const CATEGORIES = {
  EMAIL:      "Email Marketing Best Practices",
  CONTENT:    "Content Creation & Delivery",
  AUTOMATION: "Marketing Automation",
  DATA:       "Subscriber & Data Management",
  ANALYTICS:  "Insights & Analytics"
};

// ---------- Category Exam Weights ----------
const CATEGORY_WEIGHTS = {
  [CATEGORIES.EMAIL]:      "24%",
  [CATEGORIES.CONTENT]:    "22%",
  [CATEGORIES.AUTOMATION]: "28%",
  [CATEGORIES.DATA]:       "16%",
  [CATEGORIES.ANALYTICS]:  "10%"
};

// ---------- Category to Tab Mapping ----------
// Tab 0 = Dashboard, Tabs 1-5 = Categories, Tab 6 = Full Simulator
const TAB_CATEGORIES = [
  null,                      // Tab 0: Dashboard
  CATEGORIES.EMAIL,          // Tab 1
  CATEGORIES.CONTENT,        // Tab 2
  CATEGORIES.AUTOMATION,     // Tab 3
  CATEGORIES.DATA,           // Tab 4
  CATEGORIES.ANALYTICS,      // Tab 5
  null                       // Tab 6: Full Simulator
];

// ---------- Global State ----------
const state = {
  questions: [],
  activeTab: 0,
  mode: "study",
  answers: {},
  submitted: {},
  shuffleMap: {},
  timerInterval: null,
  timerSeconds: 105 * 60,
  examSubmitted: false
};

// ---------- DOM References ----------
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// ============================================================
// SECTION 1: PASSWORD SECURITY
// ============================================================

const TARGET_PASSWORD_HASH = "79f75d16"; // Hash of "Salesforce2026"

function djb2(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
}

window.checkPassword = function (e) {
  if (e) e.preventDefault();
  const input = document.getElementById("password-input");
  const errorEl = document.getElementById("password-error");
  if (!input) return;
  const entered = input.value;
  if (djb2(entered) === TARGET_PASSWORD_HASH) {
    unlockApp();
  } else {
    if (errorEl) errorEl.style.display = "block";
    input.value = "";
    input.focus();
  }
};

function unlockApp(instant = false) {
  sessionStorage.setItem("simulator_unlocked", "true");
  const overlay = document.getElementById("password-overlay");
  const header = $(".app-header");
  const main = $("#app-container");

  if (overlay) {
    if (instant) {
      overlay.style.transition = "none";
      overlay.style.display = "none";
    }
    overlay.classList.add("unlocked");
  }
  if (header) header.classList.remove("hidden");
  if (main) main.classList.remove("hidden");
}



// ============================================================
// SECTION 2: HARDCODED QUESTIONS MATRIX
// ============================================================

const QUESTIONS = [
  {
    "id": 1,
    "category": "Email Marketing Best Practices",
    "question": "The marketing team at Northern Trail Outfitters observed a bounce rate of 23% for their last email send. Which best practice should they follow to uphold their sender reputation?",
    "choices": [
        "Nothing-bounce rates up to 30% are acceptable.",
        "Continue monitoring the bounce rate for changes.",
        "Remove the bounced addresses before the next send."
    ],
    "correctAnswerText": "Remove the bounced addresses before the next send.",
    "explanation": "High bounce rates severely harm deliverability and sender\nreputation. Removing bad/bounced email addresses before sending another\ncampaign ensures you aren’t repeatedly hitting invalid inboxes or trigger spam\ntraps. (A) Rates up to 30% are dangerously high and would severely damage\nsender reputation. (B) Passive monitoring without taking action doesn’t protect\nreputation."
},
  {
    "id": 2,
    "category": "Email Marketing Best Practices",
    "question": "An email marketer is creating an email to promote the new Northern Trail Outfitters mobile app. Which text should be used for the call-to-action button to drive the most engagement?",
    "choices": [
        "Our new mobile app",
        "Download our new mobile app here",
        "Download now"
    ],
    "correctAnswerText": "Download now",
    "explanation": ""
},
  {
    "id": 3,
    "category": "Email Marketing Best Practices",
    "question": "Northern Trail Outfitters wants to use an AI-based approach to target subscribers who are not receiving too many emails but are engaging constantly with the emails sent to them. Which feature should help achieve this?",
    "choices": [
        "Einstein Messaging Insight",
        "Einstein Engagement Scoring",
        "Einstein Engagement Frequency"
    ],
    "correctAnswerText": "Einstein Engagement Frequency",
    "explanation": "Identifies the ideal number of emails to send each contact, helping\nyou target active users who are not yet overwhelmed with too many messages. (B)\nPredicts a subscriber’s likelihood to open or click, but does not specifically\nmeasure send-load saturation. (A) Alerts you to anomalies or unusual changes in\nyour campaign performance metrics rather than managing contact frequency."
},
  {
    "id": 4,
    "category": "Email Marketing Best Practices",
    "question": "A marketer has been asked to collect consumer information using Marketing Cloud for users obtained from social channels for future mailing. What should the marketer do to accomplish this?",
    "choices": [
        "Create CloudPages to collect and subscribe users.",
        "Use Journey Builder to build an audience using Ad Studio.",
        "Leverage Social Studio to capture email addresses."
    ],
    "correctAnswerText": "Create CloudPages to collect and subscribe users.",
    "explanation": "SMC Email is explicitly designed to capture, organize and act on\nprospect data on user information from external channels (social media links), and\ndirectly write those contacts into Data Extensions for future email sends. (B) Ad\nStudio is used for targeting existing audiences with digital advertising, not for net-\nnew data collection. Social Studio is a social media listening, publishing, en\nengagement tool, it’s not designed for capturing email addresses for mailing lists."
},
  {
    "id": 5,
    "category": "Email Marketing Best Practices",
    "question": "Northern Trail Outfitters' customer base has high engagement on mobile devices, and a marketing intern is creating an email campaign tomorrow. Which mobile optimization option provides the quickest turnaround and easiest implementation?",
    "choices": [
        "Mobile Responsive",
        "Mobile Aware",
        "Responsive Aware"
    ],
    "correctAnswerText": "Mobile Aware",
    "explanation": "Mobile Aware employs a single-column layout with large fonts and\nscale-optimized images that function perfectly across all devices OOB, offering\nthe fastest and simplest creation. (A) It demands complex development using CSS\nmedia queries and extensive multi-device testing to alter the layout dynamically.\n(C) It is a fabricated, non-existing term within SMC design principles and serves\nonly as a distractor."
},
  {
    "id": 6,
    "category": "Email Marketing Best Practices",
    "question": "Northern Trail Outfitters (NTO) is launching a post-purchase campaign that emails customers to ask for feedback on their most recent shopping experience. What should the NTO marketing team include in the email design to encourage a high response rate?",
    "choices": [
        "A call-to-action button that links to the feedback form",
        "An Interactive Email Form that links to a confirmation page",
        "A Salesforce Survey block called in by an AMPscript function"
    ],
    "correctAnswerText": "An Interactive Email Form that links to a confirmation page",
    "explanation": "This allows customers to type and submit their feedback directly\ninside the email client, significantly reducing friction and encouraging a much\nhigher response rate. (A) This requires users to click out of the email and open an\nexternal web browser tab, creating additional friction that reduces response rates.\n(C) Is an overly complex and inaccurate configuration for Content Builder email\ndesign, as native interactive blocks handle form submissions directly without\ncustom AMPscript coding."
},
  {
    "id": 7,
    "category": "Email Marketing Best Practices",
    "question": "A marketer at Northern Trail Outfitters is asked about whether there is an actual requirement of a dedicated IP to send emails. What is a key differentiator to get a dedicated IP rather than using a shared one?",
    "choices": [
        "Requirement to have Custom URLs on images hosted in Marketing Cloud",
        "Sending Volume>250,000 Emails/Month",
        "Requirement to have Custom URLs on Cloud Pages"
    ],
    "correctAnswerText": "Sending Volume>250,000 Emails/Month",
    "explanation": "SMCE officially mandates that any account exceeding a volume of\n250,000 email messages per month must use a dedicated IP to independently\nmanage and safeguard their sender reputation. (A) Custom URLs for brand-\naligned images are managed through domain configurations like a SAP, which\ndoes not inherently require or trigger the technical mandate for a dedicated IP\naddress. (C) Custom URLs on CloudPages are achieved by configuring a private\ndomain and securing it with an SSL certificate within Web Studio, a feature\nindependent of your email sending IP structure."
},
  {
    "id": 8,
    "category": "Email Marketing Best Practices",
    "question": "A marketer with Northern Trail Outfitters needs to review how different variations of an email will render in different email clients. Which tool should the marketer use?",
    "choices": [
        "Send Preview",
        "Test Send",
        "Content Detective"
    ],
    "correctAnswerText": "Send Preview",
    "explanation": "Allows marketers to see exactly how an email will render for different\nsubscribers, different data, and across multiple email clients and devices - all\nwithout sending anything. (B) Sends and actual version of the email directly to\nspecific internal email addresses for live testing. (C) Analyzes your email content\nto identify potential spam-triggering phrases and formatting issues that could hurt\ndeliverability."
},
  {
    "id": 9,
    "category": "Email Marketing Best Practices",
    "question": "A marketer for Northern Trail Outfitters needs to see test emails for each subscriber in a data extension. What should the marketer do to ensure the data extension appears as a Recipient Test Data Extension in the Test Send menu?",
    "choices": [
        "Save the data extension in the Test Folder.",
        "Associate the data extension to the Campaign.",
        "Create the data extension as 'Is Testable'."
    ],
    "correctAnswerText": "Create the data extension as 'Is Testable'.",
    "explanation": "You must check the “Is Testable?” Checkbox in the properties of a\ndata extension so that SMC recognizes it as a valid recipient source for the Test\nSend menu. (A) Folders are only used for organization and file structure inside MC.\n(B) Linking a a data extensions to a Campaign helps organize marketing assets\nand track analytics, but it does not modify the data extension settings to make it\nappear in the test menu."
},
  {
    "id": 10,
    "category": "Email Marketing Best Practices",
    "question": "Northern Trail Outfitters(NTO)wants to test Einstein Recommendations against the company's static product recommendations in a product return confirmation email. Next. NTO needs to evaluate the results and choose the winning option for future confirmations. Which journey type is best suited to run this test?",
    "choices": [
        "Multi-Step",
        "Single Send",
        "Transactional Send"
    ],
    "correctAnswerText": "Multi-Step",
    "explanation": "Multi-Steps journeys support advanced split activities like Path\nOptimizer, which allows you to test different content variants (Einstein vs. static\nrecommendations) within the same stream, evaluate performance metrics, and\nautomatically route feature subscribers to the winning path. (B) Designed for\nlinear, one-time promotional blasts to a target audience and do not support\ndynamic testing branches. (C) Built solely for instantaneous, critical messages\n(like password resets) using a high-priority queue."
},
  {
    "id": 11,
    "category": "Email Marketing Best Practices",
    "question": "Northern Trail Outfitters(NTO)is having an issue with bad email addresses coming into its website email signup form, impacting deliverability and sender reputation. What should NTO use to make sure email addresses are valid before adding to its audience?",
    "choices": [
        "A double opt-in at signup",
        "Add CAPTCHA validation to the form",
        "Leverage a Smart Capture block"
    ],
    "correctAnswerText": "A double opt-in at signup",
    "explanation": "Send a verification link to the user’s inbox requiring them to confirm.\nEnsures only live, valid, and verified email addresses are added to the audience\nDB. (B) CAPTCHA blocks automated bots and malicious form submissions, it\ncannot verify if a human user typed a real or operational address. (C) Is simply the\nstandard form tool used to collect data in MC. It does not validate operational\nstatus."
},
  {
    "id": 12,
    "category": "Email Marketing Best Practices",
    "question": "The marketing team at Northern Trail Outfitters is concerned about its email deliverability rates over the last three months. Which remediation tactic should be used to improve deliverability?",
    "choices": [
        "Broaden segmentation criteria to reach more diverse audiences.",
        "Increase the frequency of email sending to boost engagement.",
        "Scale back sending for specific ISPs until the issue subsides."
    ],
    "correctAnswerText": "Scale back sending for specific ISPs until the issue subsides.",
    "explanation": "When deliverability drops, it is often due to a specific ISP throttling or\nblocking your messages based on sudden reputation issues. (A) Broadening your\nsegmentation criteria means sending to less targeted or less engaged users. (B)\nSending more emails to an audience already experiencing low deliverability, will\ncause subscriber fatigue."
},
  {
    "id": 13,
    "category": "Email Marketing Best Practices",
    "question": "Northern Trail Outfitters(NTO)sends 500,000 emails per month and shares its sending domain and IP with other customers. Which action ensures NTO's sending reputation remains intact?",
    "choices": [
        "Implement an SAP with Private Domain and a Dedicated IP.",
        "Request a Private Domain to leverage SPF and DKIM authentication.",
        "Request three Dedicated IPs to spread out the sending volume."
    ],
    "correctAnswerText": "Implement an SAP with Private Domain and a Dedicated IP.",
    "explanation": "A Sender Authentication Package (SAP) is the standard solution for\nvolumes exceeding 250,000 emails per month. By providing a private domain and\na dedicated IP, it completely isolates the company’s sending reputation. (B) While\nit sets up key SPF and DKIM authentications, stays on a shared IP, meaning that\nsender reputation would remain directly tied to the bad practices or blacklists. (C)\nSplitting would leave each IP with too little traffic, making it impossible to establish\na steady, recognizable sending history."
},
  {
    "id": 14,
    "category": "Email Marketing Best Practices",
    "question": "The marketing team has been troubleshooting why an email was not sent to 10% of the audience within the data extension. When they review the tracking for the job ID, they see O subscribers were held or unsubscribed. Which additional issues should they consider?",
    "choices": [
        "Bounced contacts from previous sends",
        "DoNotTrack preferences",
        "Suppressed contacts from contact deletion"
    ],
    "correctAnswerText": "Bounced contacts from previous sends",
    "explanation": "Subs with a status of Bounced from previous campaigns may be\nskipped or excluded from a current send job. Because they have not yet met the\nstrict consecutive criteria to automatically transition into a permanent held or\nunsub status. (B) Are web privacy preferences, they do not interact with or dictate\nthe backend email sending logic. (C) Contacts undergoing a contact deletion\nprocess enter a brief suppression window."
},
  {
    "id": 15,
    "category": "Email Marketing Best Practices",
    "question": "An upcoming campaign at Northern Trail Outfitters (NTO) has an audience list larger than the company's daily sends. NTO's marketing team is concerned about this send affecting deliverability. Which feature should help NTO achieve this send while keeping deliverability metrics in mind?",
    "choices": [
        "Einstein Engagement Frequency",
        "Sender Authentication Package",
        "Send Throttling"
    ],
    "correctAnswerText": "Send Throttling",
    "explanation": "Allows you to set a maximum number of emails sent per hour during a\ncampaign rollout, by spacing out the delivery over a longer period, it prevents\nsudden spikes in volume. (A) This AI tool optimizes the frequency of emails sent to\nindividuals over time to prevent subscriber fatigue, but it cannot control or break\nup a massive single-day volume spike. (B) Account-level setup used to configure\ndomain authentication."
},
  {
    "id": 16,
    "category": "Email Marketing Best Practices",
    "question": "A marketer wants to quickly view the link performance for a specific email, including Total Clicks and Unique Clicks. Which area of the application should provide this data?",
    "choices": [
        "Email Overlay View",
        "Send Performance Tab",
        "Tracking Conversions Tab"
    ],
    "correctAnswerText": "Email Overlay View",
    "explanation": "This view provides a visual layout of the sent email template within the\ntracking dashboard. (B) This tab provides a high-level agregate summary of the\noverall email send performance. (C) This section I designed specifically to track\nand display post-click conversion actions."
},
  {
    "id": 17,
    "category": "Email Marketing Best Practices",
    "question": "Northern Trail Outfitters (NTO) notices a larger than normal drop in engagement and a spike in unsubscribes after its sales team added a newsletter that is sent three times a week, in addition to the normal commercial marketing messages sent throughout the week. Which action should be taken to reduce the number of unsubscribes and increase engagement for NTO's program?",
    "choices": [
        "Create more focused segmented lists for messaging.",
        "Focus on action-driven subject lines.",
        "Add complementary SMS campaigns."
    ],
    "correctAnswerText": "Create more focused segmented lists for messaging.",
    "explanation": "The drop in engagement and spike in unsubscribes are caused by\nsubscriber fatigue. By segmenting lists, subs inly receive highly relevant content.\n(B) Do not address the core issue of over-saturation. (C) This would worsen the\nproblem."
},
  {
    "id": 18,
    "category": "Content Creation & Delivery",
    "question": "Northern Trail Outfitters is sending a welcome email to a new group of customers. When the marketer deploys the email, no email is sent. Which configuration caused the send to fail?",
    "choices": [
        "Failure to choose the send classification",
        "Two fields with 'EmailAddress' data type",
        "Incorrect Sending Relationship"
    ],
    "correctAnswerText": "Incorrect Sending Relationship",
    "explanation": "A sendable data extension requires a properly mapped Sending\nRelationship to link your data fields directly to the central All Subscribers list. (A) If\na marketer completely forgets to select a send classification, the system interface\nprevents the user from initiating or deploying the send altogether. (B) A sendable\ndata extension can contain multiple fields configured with the ‘EmailAddress’ data\ntype."
},
  {
    "id": 19,
    "category": "Content Creation & Delivery",
    "question": "Leading up to various holiday seasons, Northern Trail Outfitters(NTO)plans to include special events and content in its emails. This content will change throughout the year. What should NTO use to ensure the most up-to-date content is included in each email?",
    "choices": [
        "Einstein Content Selection",
        "Reference Content Block",
        "Dynamic Content Block"
    ],
    "correctAnswerText": "Reference Content Block",
    "explanation": "It links multiple emails to a single source asset. Updating the master\nblock automatically applies the new content across all connected emails. (A) It\nuses AI to optimize assets per individual at open time, rather than pulling manually\nupdated master content. (C) It targets different versions of content to specific\ntarget segment simultaneously based on audience data rules."
},
  {
    "id": 20,
    "category": "Content Creation & Delivery",
    "question": "A marketing manager notices emails cluttered with images that are inconsistent with branding guidelines. Which step should they take to restrict the types of content within a content slot?",
    "choices": [
        "Configure restrictions within a Content Area for approved block types.",
        "Under user permissions, select limited template access.",
        "Configure Content Blocks to only be usable within approved templates."
    ],
    "correctAnswerText": "Configure restrictions within a Content Area for approved block types.",
    "explanation": "Templates allow admins to lock down or restrict a specific Content\nArea (slot) to only accept specified block types, preventing users from adding off-\nbranches content. (B) User permissions control general access to creating or\nediting templates, but they cannot restrict specific content elements within an\nindividual template layout. (C) MC does not have a native configuration to lock\nindividual content blocks to specific templates."
},
  {
    "id": 21,
    "category": "Content Creation & Delivery",
    "question": "Northern Trail Outfitters receives nightly files from its data warehouse to maintain opt-out compliance across multiple marketing platforms. These files contain only the previous day's opt-out updates. If a run fails, it must be manually rerun to maintain compliance. How should the notification be received if the data import is unsuccessful?",
    "choices": [
        "Import Activity Notification Settings",
        "Automation Notification Settings",
        "Configured Alert Manager Settings"
    ],
    "correctAnswerText": "Import Activity Notification Settings",
    "explanation": "The Import Activity has its own notification settings that alert a\nspecified email address when that specific import activity succeeds or fails."
},
  {
    "id": 22,
    "category": "Content Creation & Delivery",
    "question": "A marketing intern forgot to remove [FOR APPROVAL] from the subject line before sending an email to the company's largest audience. Which feature, if configured, should provide a warning prior to sending?",
    "choices": [
        "Subscriber Preview and Test Send",
        "Subject and Preheader Validation",
        "Content Detective"
    ],
    "correctAnswerText": "Subject and Preheader Validation",
    "explanation": "Scans your text for custom defined placeholder terms or automatically\ntriggers a warning block prior to deployment. (A) Is used to manually inspect\nindividual rendering and personalization strings, but it does not automatically scan\nfor or flag specific workflow placeholder words. (C) Scans the body copy of an\nemail specifically to catch potential spam-trigger components."
},
  {
    "id": 23,
    "category": "Content Creation & Delivery",
    "question": "Northern Trail Outfitters recently purchased stock art to be used within its emails. However, given the sheer amount of content, locating images for specific campaigns proves to be difficult. Which solution should make locating appropriate images easier?",
    "choices": [
        "Import a metadata tag index for the stock art so the images are searchable.",
        "Configure Einstein Content Tagging to automatically tag stock art.",
        "Select categories and content type from the import dropdown when importing images."
    ],
    "correctAnswerText": "Configure Einstein Content Tagging to automatically tag stock art.",
    "explanation": "Uses built-in AI image recognition to automatically apply searchable\ntags to graphics upon upload. (A) Content Builder does not support an external\nbulk-import method to map metadata. (C) Dropdown option categorize high-level\nformat settings during an upload but lack the capabilities required to locate\nspecific campaign visuals."
},
  {
    "id": 24,
    "category": "Content Creation & Delivery",
    "question": "Northern Trail Outfitters(NTO)is warming up a new IP address primarily for a new product line. Initially, NTO wants to move some of its lower-volume transactional sends onto this new IP. Where should NTO update the IP configured for these sends?",
    "choices": [
        "From Address Management",
        "Sender Profile",
        "Delivery Profile"
    ],
    "correctAnswerText": "Delivery Profile",
    "explanation": "Is where the sending IP address is configured in MC. To move sends\nto a new IP, update the Delivery Profile assigned to those transactional sends to\npoint to the new IP. (A) This manages “from” name and email address, not the IP\nused for sending. (B) The Sender stores the from name and email address details."
},
  {
    "id": 25,
    "category": "Content Creation & Delivery",
    "question": "After receiving approval from their team, a marketer scheduled a promotional email send. After the send was scheduled and the team was notified, they received additional feedback which called for edits to the email copy. Where should the marketer cancel the send?",
    "choices": [
        "Tracking tab in Journey Builder",
        "Overview tab in Email Studio",
        "Pending tab in Content Builder"
    ],
    "correctAnswerText": "Overview tab in Email Studio",
    "explanation": "Scheduled email send in Email Studio are managed and cancelled\nfrom the Overview tab, where pending/scheduled send apear and can be cancelled\nbefore they go out. (A) This is for monitoring journey performance metrics. (C)\nContent Builder Is for creating and managing content assets."
},
  {
    "id": 26,
    "category": "Content Creation & Delivery",
    "question": "Northern Trail Outfitters is redesigning its brand guidelines and wants to ensure its emails are accessible. Which best practice should the email designer follow to meet accessibility standards?",
    "choices": [
        "Use contrasting colors.",
        "Build image-based emails.",
        "Minimize whitespace."
    ],
    "correctAnswerText": "Use contrasting colors.",
    "explanation": "High color contrast between text and background is a core WCAG\naccessibility requirement, ensuring content is readable for users with visual\nimpairments or color blindness. (B) Image-based emails are actually an\naccessibility anti-pattern — screen readers can't read text embedded in images,\nand if images are blocked, the entire message becomes unreadable. (C)\nWhitespace actually improves accessibility by making content easier to scan and\nreducing cognitive load. Minimizing it works against accessibility, not for it."
},
  {
    "id": 27,
    "category": "Content Creation & Delivery",
    "question": "The data team at Northern Trail Outfitters (NTO) has configured a data extension that contains all customer transactions within the last 90 days. NTO's marketing team would like to target customers who have purchased a camping tent or foldout camper in the last week; however, for this campaign, they would like to exclude anyone who has a 'silver' status. Which three tools should be used to segment this data?",
    "choices": [
        "Query, Filter Definition, Journey Builder Entry Source",
        "SQL Query, Decision Split, Data Designer",
        "The send is cancelled when the approval is withdrawn."
    ],
    "correctAnswerText": "Query, Filter Definition, Journey Builder Entry Source",
    "explanation": "You can use a SQL Query or Filter Definition to segment the\npurchasing audience from the data extension, and then leverage a Journey Builder\nEntry Source to target or exclude contacts. (B) Decision Split is used inside a\njourney to branch contacts based on conditions — it's not a segmentation tool\nused before entry. Data Designer is for connecting data relationships, not filtering\naudiences for a campaign. (C) This answer doesn't even address the question — it\nappears to be a leftover answer from a different question (likely about approval\nworkflows). It's completely irrelevant here."
},
  {
    "id": 28,
    "category": "Content Creation & Delivery",
    "question": "A marketer has scheduled an email that was approved in Content Builder Approvals by their manager. The marketer then receives a message from their manager that changes are needed and email approval has been withdrawn. What should happen with the scheduled send, if no other action is taken?",
    "choices": [
        "The originally approved version of the email will send.",
        "The send is cancelled when the approval is withdrawn.",
        "The send is paused until approved again."
    ],
    "correctAnswerText": "The originally approved version of the email will send.",
    "explanation": "Answer (A) Withdrawing an approval in Content Builder does not automatically\ncancel or pause an already queued send job; it will deploy the snapshot version\noriginally approved unless manually canceled. (B) The system does not\nautomatically revoke or cancel scheduled send queues when an item's approval\nstatus changes. (C) Marketing Cloud does not place scheduled sends on hold\nautomatically; the campaign will deploy as scheduled unless a user manually stops\nit in Email Studio."
},
  {
    "id": 29,
    "category": "Content Creation & Delivery",
    "question": "Following a batch email send, Northern Trail Outfitters wants to update an email link's URL. Which action should be recommended?",
    "choices": [
        "Navigate to URL Expiration in Setup and update the URL.",
        "Navigate to the email in Content Builder and update the URL.",
        "Navigate to the Job Links tab in My Tracking and update the URL."
    ],
    "correctAnswerText": "Navigate to the Job Links tab in My Tracking and update the URL.",
    "explanation": "After a batch send has gone out, the links are tracked at the job level.\nThe Job Links tab in My Tracking allows you to update a URL after the send,\nredirecting any clicks on the old link to the new destination — without needing to\nresend the email. (A) URL Expiration is for setting how long tracked links remain\nactive, not for editing or replacing a link's destination URL after a send. (B)\nUpdating the master asset in Content Builder only affects future deployments; it\ncannot change links in emails that have already landed in subscriber inboxes."
},
  {
    "id": 30,
    "category": "Content Creation & Delivery",
    "question": "Northern Trail Outfitters (NTO) is going through IP address warming and would like to understand the metrics of the email sends on a domain level. Which out-of-the-box report should NTO use to get this information to refine to its sending methods?",
    "choices": [
        "Email Sends by User",
        "Recent Email Send Summary Email",
        "Performance by Domain"
    ],
    "correctAnswerText": "Performance by Domain",
    "explanation": "This standard report breaks down delivery, bounce, and open metrics\nby individual email domains (e.g., gmail.com, yahoo.com), which is essential to\ntrack deliverability across specific ISPs during an IP warming process. (A) This\nreport shows send activity broken down by the Marketing Cloud user who sent it —\nnot by domain. Not useful for IP warming analysis. (B) This provides a high-level\nsummary of recent sends overall, not segmented by domain. It doesn't give the\ndomain-level granularity needed during IP warming."
},
  {
    "id": 31,
    "category": "Content Creation & Delivery",
    "question": "A global marketing team has created an email using Content Builder Approvals and shared it with multiple business units in their Enterprise. Even though the email was approved, additional changes are needed. What is the first action that should be taken to make the edits?",
    "choices": [
        "Withdraw email approval.",
        "Unshare the email.",
        "Cancel send using email."
    ],
    "correctAnswerText": "Withdraw email approval.",
    "explanation": "An approved email in Content Builder is locked from editing. The first\nstep to make any changes is to withdraw the approval, which unlocks the email for\nediting. Only then can edits be made and the email resubmitted for approval. (B)\n• Unsharing removes access for other business units but doesn't unlock\nthe email for editing. It's not a prerequisite for making changes and would disrupt\nthe other BUs unnecessarily. (C) This action removes or pauses a deployment job\nfrom the delivery queue, but it does not change the approval status or unlock the\nmaster template for copy edits."
},
  {
    "id": 32,
    "category": "Content Creation & Delivery",
    "question": "Northern Trail Outfitters (NTO) has expanded into 15 new countries and needs to send localized content. NTO works with an agency to provide the translations, but they lack email developer resources. What should NTO do to create and send localized content at scale?",
    "choices": [
        "Leverage templates with AMPscript.",
        "Leverage Enhanced Dynamic Content.",
        "Leverage Multilingual Content Blocks."
    ],
    "correctAnswerText": "Leverage Enhanced Dynamic Content.",
    "explanation": "Enhanced Dynamic Content lets you swap content blocks based on\ndata (like a country or language field) without any coding. The agency can provide\ntranslations, which are loaded into the dynamic content rules, and the right version\nis served to each recipient automatically — no developer needed, fully scalable\nacross 15 countries. (A) AMPscript can handle localization, but it requires\ndeveloper resources to write and maintain — which the scenario explicitly says\nNTO lacks. (C) This isn't a native Marketing Cloud feature. There's no out-of-the-\nbox \"Multilingual Content Blocks\" tool in SFMC, making this a distractor option."
},
  {
    "id": 33,
    "category": "Content Creation & Delivery",
    "question": "Northern Trail Outfitters wants to organize its assets so images can be easily searched by tags in Content Builder. However, most images have multiple tags that could be applied, which makes it more difficult to filter to a manageable number of results. How should the number of tags selected for an asset be minimized while still providing the necessary granularity?",
    "choices": [
        "Make the Customer Key more descriptive.",
        "Use nested tags to create hierarchies.",
        "Leverage Einstein for content tagging."
    ],
    "correctAnswerText": "Use nested tags to create hierarchies.",
    "explanation": "Nested tags create hierarchies (e.g., \"Apparel > Jackets > Winter\"), so\none specific tag implies all its parents, reducing the total number of tags needed\nwhile maintaining granularity. (A) The Customer Key is a unique identifier for\nassets, not a searchable tag — making it descriptive doesn't help with tag filtering.\n(C) Einstein Content Tagging auto-tags images but doesn't address the problem of\ntoo many tags being applied; it would likely add more, not fewer."
},
  {
    "id": 34,
    "category": "Content Creation & Delivery",
    "question": "Northern Trail Outfitters (NTO) stores sales representative information in a data extension. NTO wants to personalize the From Name in emails with the targeted customer's specific representative. Which functionalities accomplish the requested configuration?",
    "choices": [
        "Send Classification and Subscriber Attributes",
        "Sender Profile and AMPscript Lookup",
        "Delivery Profile and AMPscript Lookup"
    ],
    "correctAnswerText": "Sender Profile and AMPscript Lookup",
    "explanation": "The Sender Profile holds the From Name field, and AMPscript Lookup\ncan pull the specific sales rep's name from the data extension dynamically —\ntogether they personalize the From Name per recipient. (A) Send Classification\nsets the overall sending category (commercial/transactional) and Subscriber\nAttributes are profile-level fields, neither of which enables dynamic per-row data\nextension lookups for the From Name. (C) The Delivery Profile controls the\nsending IP, not the From Name — pairing it with AMPscript doesn't address the\nright field."
},
  {
    "id": 35,
    "category": "Content Creation & Delivery",
    "question": "Northern Trail Outfitters is looking at solutions that provide warnings/advice automatically about Email Sends using Artificial Intelligence. Which standard tool best does this?",
    "choices": [
        "Einstein Copy Insights",
        "Einstein Email Recommendations",
        "Einstein Messaging Insights"
    ],
    "correctAnswerText": "Einstein Messaging Insights",
    "explanation": "Einstein Messaging Insights automatically surfaces AI-driven warnings\nand recommendations about email send performance — such as unusual\nengagement drops or deliverability issues — directly alerting marketers to take\naction. (A) Einstein Copy Insights analyzes subject line language and tone to\nsuggest improvements, but it's focused on copy quality, not automated send\nwarnings. (B) Einstein Email Recommendations suggests personalized product or\ncontent recommendations for email recipients — it's not an alerting or advisory\ntool for send performance."
},
  {
    "id": 36,
    "category": "Content Creation & Delivery",
    "question": "Northern Trail Outfitters wants to send a personalized email to its loyalty program members. The email should include details about loyalty members' profiles, point balance, and purchase behavior. This data exists in Marketing Cloud across several data extensions. What should a marketer use to build this level of personalization into the email?",
    "choices": [
        "AMPscript Search Functions",
        "Enhanced Dynamic Content Blocks",
        "Personalization Strings"
    ],
    "correctAnswerText": "AMPscript Search Functions",
    "explanation": "AMPscript Search Functions (like LookupRows and Lookup) can query\nacross multiple data extensions at send time to retrieve profile, point balance, and\npurchase behavior data for each individual recipient — enabling deep, multi-\nsource personalization. (B) Enhanced Dynamic Content swaps content blocks\nbased on field values, but it can't perform lookups across multiple data extensions\nto pull complex relational data. (C) Personalization Strings only pull simple\nsubscriber attribute values from a single source — they can't handle multi-\nextension data retrieval."
},
  {
    "id": 37,
    "category": "Content Creation & Delivery",
    "question": "The customer success team at Northern Trail Outfitters wants to build out a profile for its subscribers to improve segmentation for future sends. Which content block should the team use to capture this information directly from the inbox for some subscribers?",
    "choices": [
        "Smart capture block",
        "Interactive Email Form block",
        "Einstein content block"
    ],
    "correctAnswerText": "Interactive Email Form block",
    "explanation": "The Interactive Email Form block allows subscribers to fill out and\nsubmit a form directly within the email inbox, capturing profile data without\nredirecting them to an external page — perfect for enriching subscriber profiles at\nscale. (A) Smart Capture blocks are used in CloudPages (landing pages), not\ninside emails — they can't capture data directly from the inbox. (C) Einstein\nContent Block delivers AI-powered personalized content recommendations inside\nemails, it's not a data capture tool."
},
  {
    "id": 38,
    "category": "Content Creation & Delivery",
    "question": "Northern Trail Outfitters (NTO) wants to improve the accessibility of its email design. Which best practice should NTO employ?",
    "choices": [
        "Reduce line spacing to fit more content on the screen and reduce scrolling.",
        "Increase the font size (over 16pt) to make the content easier to read.",
        "Remove role=\"presentation\" from layout tables to support assistive technologies."
    ],
    "correctAnswerText": "Increase the font size (over 16pt) to make the content easier to read.",
    "explanation": "Setting role=\"presentation\" on layout tables tells screen readers to\nignore the table structure and focus on the actual content — removing it (or rather,\nkeeping it properly set) ensures assistive technologies can navigate the email\ncorrectly. (A) Reducing line spacing hurts readability and accessibility — proper\nspacing is a WCAG best practice to aid users with cognitive and visual\nimpairments. (B) While larger fonts help readability, 16pt is already the\nrecommended minimum — simply going \"over 16pt\" without consideration isn't a\ndefined accessibility best practice and could disrupt layout."
},
  {
    "id": 39,
    "category": "Content Creation & Delivery",
    "question": "Northern Trail Outfitters (NTO) currently uses AMPscript to create customized content for its subscribers. Which actions should help build confidence in NTO's dynamic email capabilities?",
    "choices": [
        "Use CloudPages to duplicate the dynamic code and test it by using manual subscriber inputs.",
        "Use a Guided Send to perform a test send to internal users using subscriber data.",
        "Use Preview and Test, select a targeted subscriber, and send the email to internal team members."
    ],
    "correctAnswerText": "Use Preview and Test, select a targeted subscriber, and send the email to internal team members.",
    "explanation": "Using Preview and Test with a targeted subscriber renders the\nAMPscript dynamically against real subscriber data, then sending to internal team\nmembers lets the team verify the personalized output looks correct before a live\nsend — directly building confidence in the dynamic content. (A) CloudPages is a\nlanding page tool, not designed for testing email AMPscript rendering against\nsubscriber data in the way email sends require. (B) Guided Send is a send\nworkflow wizard, not a testing feature — it doesn't provide a way to validate\ndynamic content rendering against specific subscriber data before committing to a\nfull send."
},
  {
    "id": 40,
    "category": "Content Creation & Delivery",
    "question": "Northern Trail Outfitters (NTO) has multiple lines of businesses sharing one business unit. NTO wants to ensure its customers can identify their specific line of business when receiving an email. Which setting should be configured in a send to identify the line of business sending the message?",
    "choices": [
        "Sender Authentication Package",
        "Sender Profile",
        "Brand Builder"
    ],
    "correctAnswerText": "Sender Profile",
    "explanation": "The Sender Profile stores the From Name and From Email Address,\nwhich is exactly what customers see to identify who is sending the email —\nconfiguring a unique Sender Profile per line of business makes each one clearly\nrecognizable in the inbox. (A) Sender Authentication Package (SAP) handles\ndomain authentication and branding for deliverability purposes, not for identifying\na specific line of business to the recipient. (C) Brand Builder is used to set visual\nbranding styles within Marketing Cloud's interface, not a send-level setting that\naffects what recipients see in their inbox."
},
  {
    "id": 41,
    "category": "Content Creation & Delivery",
    "question": "A marketer is testing an email that includes an Interactive Email Form and discovers the form is missing when the email is opened in Gmail. What guidance should be given to the email developer to ensure the interactive form displays correctly?",
    "choices": [
        "Ensure fallback content has been configured for Gmail.",
        "Ensure characters in the CSS tags are limited to 16kB.",
        "Ensure the 'Optimize for Gmail' checkbox is selected."
    ],
    "correctAnswerText": "Ensure fallback content has been configured for Gmail.",
    "explanation": "Gmail doesn't support AMP for Email (which powers Interactive Email\nForms) in all cases, so fallback content must be configured to display static\ncontent when the interactive form can't render — without it, the form simply\nappears missing. (B) The 16kB CSS limit is a Gmail rendering consideration for\nstylesheets, but it's not the reason an Interactive Email Form goes missing —\nthat's an AMP support issue, not a CSS size issue. (C) There is no \"Optimize for\nGmail\" checkbox in Marketing Cloud's Interactive Email Form settings — this is not\na real configuration option."
},
  {
    "id": 42,
    "category": "Content Creation & Delivery",
    "question": "A marketer wants to better organize their assets in Marketing Cloud. What should they do to improve searching and filtering in Content Builder?",
    "choices": [
        "Add descriptive tags to each asset upon creation.",
        "Add assets to folders upon creation.",
        "Add a description to each asset upon creation."
    ],
    "correctAnswerText": "Add descriptive tags to each asset upon creation.",
    "explanation": "Tags are directly searchable and filterable in Content Builder, making\nthem the most effective way to locate assets across folders — adding descriptive\ntags at creation time ensures assets are findable by keyword regardless of where\nthey're stored. (B) Folders help with manual browsing and organization, but they\ndon't improve Content Builder's search or filter functionality — you can't filter by\nfolder in a search. (C) Descriptions are not a searchable or filterable field in\nContent Builder, so adding them doesn't improve asset discoverability."
},
  {
    "id": 43,
    "category": "Content Creation & Delivery",
    "question": "A marketing team uses email templates as a means to create a consistent style guide. The team has recently updated the primary template to coincide with company-wide rebranding; however, content approvers are reporting they are not seeing the new changes reflected. Which step needs to be completed?",
    "choices": [
        "The template must be approved before updates are reflected.",
        "The email must be recreated using the updated template.",
        "Update Email Now' needs to be applied to each email."
    ],
    "correctAnswerText": "Update Email Now' needs to be applied to each email.",
    "explanation": "\"Update Email Now\" is the Content Builder feature that pushes\ntemplate changes to all emails built from that template — without applying it,\nexisting emails retain the old template design even after the template is updated.\n(A) Template approval is not a requirement for template updates to propagate —\nthere's no approval gate that holds back template changes from reflecting. (B)\nRecreating emails from scratch would work but is unnecessary and time-\nconsuming — \"Update Email Now\" exists precisely to avoid having to rebuild every\nemail manually."
},
  {
    "id": 44,
    "category": "Content Creation & Delivery",
    "question": "A marketer needs to personalize an email with dynamic content using data from the Open Data View and data from the Purchase Data Extension. What should be used to source the data from these different sources?",
    "choices": [
        "SQL Query Activity",
        "Data Filter",
        "Attribute Group"
    ],
    "correctAnswerText": "SQL Query Activity",
    "explanation": "A SQL Query Activity can pull and join data from both the Open Data\nView and the Purchase Data Extension into a single output data extension at send\ntime, making it available for dynamic content personalization from multiple\nsources. (B) Data Filters work on a single data source — they can't join or combine\ndata across the Open Data View and a separate data extension simultaneously. (C)\nAttribute Groups are used in Contact Builder to define relationships between data\nsources for segmentation, but they don't directly source data into an email for\ndynamic content personalization."
},
  {
    "id": 45,
    "category": "Marketing Automation",
    "question": "Northern Trail Outfitters (NTO) receives a daily file drop of customers who have made recent purchases. NTO would like to send out a 'thank you' email the first time they show up in the file drop. How should Journey Builder be configured to meet this requirement?",
    "choices": [
        "Configure Journey Email Send to dedupe on email address.",
        "Configure Journey Entry Event to 'allow no re-entry.'",
        "Configure Journey Settings to 'allow no re-entry.'"
    ],
    "correctAnswerText": "Configure Journey Settings to 'allow no re-entry.'",
    "explanation": "Configuring Journey Settings to 'allow no re-entry' ensures that once\na contact has entered the journey and received the thank you email, they cannot\nenter again on subsequent file drops — guaranteeing the email only sends the first\ntime they appear. (A) Deduping on email address at the send activity level only\nprevents duplicates within a single send batch, but doesn't stop the same contact\nfrom re-entering the journey on a future file drop. (B) The Journey Entry Event\ncontrols how contacts enter the journey, but 'allow no re-entry' is a Journey\nSettings-level configuration — not something set on the Entry Event itself."
},
  {
    "id": 46,
    "category": "Marketing Automation",
    "question": "Northern Trail Outfitters' analytics team has requested data to power a dashboard that can monitor the performance of emails across the company. Which Marketing Cloud function should be used to get this data automatically on a daily basis?",
    "choices": [
        "Tracking Extracts",
        "Report Snapshots",
        "Google Analytics Integration"
    ],
    "correctAnswerText": "Tracking Extracts",
    "explanation": "Tracking Extracts in Automation Studio can be scheduled to run daily,\nautomatically exporting detailed email performance data (sends, opens, clicks,\nbounces) to a file that can feed an external dashboard. (B) Report Snapshots\ngenerate a point-in-time report output, but they aren't designed to automatically\npush data to an external dashboard on a recurring basis at the scale needed for\ncompany-wide monitoring. (C) Google Analytics Integration tracks web behavior\nafter email clicks, not email performance metrics like opens, bounces, or sends —\nit doesn't power an email performance dashboard."
},
  {
    "id": 47,
    "category": "Marketing Automation",
    "question": "The website team at Northern Trail Outfitters has noticed performance issues on the site when the marketing team sends promotional emails. What should the marketer do to prevent this problem?",
    "choices": [
        "Use Delayed Delivery.",
        "Configure Send Throttling.",
        "Segment email sends by domain."
    ],
    "correctAnswerText": "Configure Send Throttling.",
    "explanation": "Send Throttling controls the rate at which emails are delivered,\nspreading the send over a defined period so recipients click through to the\nwebsite gradually rather than all at once — preventing traffic spikes that cause\nperformance issues. (A) Delayed Delivery postpones the start of a send to a later\ntime, but once it begins it still sends at full speed, so it doesn't spread the traffic\nload on the website. (C) Segmenting by domain splits the audience by email\nprovider (e.g., Gmail, Yahoo), which is useful for deliverability monitoring but\ndoesn't control the rate of sends or manage website traffic spikes."
},
  {
    "id": 48,
    "category": "Marketing Automation",
    "question": "Northern Trail Outfitters(NTO)sends a birthday coupon during the subscriber's birthday month. NTO wants to reward the subscriber based upon engagement with the email and provide further messages based on that interaction. Which no-code features should be implemented to accomplish this?",
    "choices": [
        "Automation Studio and Query Activity",
        "Journey Builder and Engagement Split",
        "Salesforce CDP and Einstein Engagement Scoring"
    ],
    "correctAnswerText": "Journey Builder and Engagement Split",
    "explanation": "Journey Builder orchestrates the birthday coupon send and the\nEngagement Split is a no-code activity that branches the journey based on\nwhether the subscriber opened, clicked, or ignored the email — enabling different\nfollow-up messages based on that interaction. (A) Automation Studio and Query\nActivity require SQL knowledge, making them a code-dependent solution — the\nquestion specifically asks for no-code features. (C) Salesforce CDP and Einstein\nEngagement Scoring are separate, more complex platforms focused on data\nunification and predictive scoring — they're not the right tools for a\nstraightforward engagement-based branching journey."
},
  {
    "id": 49,
    "category": "Marketing Automation",
    "question": "Northern Trail Outfitters wants to make sure important subscriber updates, such as unsubscribes, are reflected within the platform as soon as they happen due to regulatory concerns. What should be used to best achieve this in real time?",
    "choices": [
        "APIs",
        "File Drop Automations",
        "SQL Query activities"
    ],
    "correctAnswerText": "APIs",
    "explanation": "APIs allow real-time, event-driven updates — the moment an\nunsubscribe happens in an external system, it can be pushed instantly to\nMarketing Cloud via the REST API, meeting the regulatory requirement for\nimmediate reflection. (B) File Drop Automations rely on a file being placed and\nprocessed on a schedule, introducing a delay — not a real-time solution. (C) SQL\nQuery Activities run on a scheduled basis within Automation Studio, so they also\ncan't reflect changes in real time."
},
  {
    "id": 50,
    "category": "Marketing Automation",
    "question": "Northern Trail Outfitters (NTO) wants to simplify a journey that has a decision split prior to every email send to remove certain subscribers from the journey. What should NTO do to simplify the journey?",
    "choices": [
        "Use the Update Contact activity.",
        "Ensure the Contact entry mode is No re-entry.",
        "Utilize exit criteria for the journey."
    ],
    "correctAnswerText": "Utilize exit criteria for the journey.",
    "explanation": "Exit Criteria automatically removes subscribers from a journey when\nthey meet a specified condition — eliminating the need for a decision split before\nevery email send, which simplifies the journey significantly. (A) The Update\nContact activity modifies a contact's data attributes within the journey but doesn't\nremove them from it — it can't replace the filtering role the decision splits are\nplaying. (B) No re-entry prevents contacts from entering the journey more than\nonce, but it doesn't remove contacts already in the journey based on conditions —\nit's an entry control, not an exit mechanism."
},
  {
    "id": 51,
    "category": "Marketing Automation",
    "question": "A marketer wants to send emails to segments that are created from multiple data extensions on a daily basis. The daily sends kick off a complex campaign with multiple messages in both Email and Mobile. Which action should they take to execute the campaign?",
    "choices": [
        "Use Automation Studio Filtering, Messaging, and Wait Activities.",
        "Use Automation Studio query for segmentation and Journey Builder for Messaging and Flow.",
        "Use Journey Builder Recurring Entry Source, Messaging, and Flow Control Activities."
    ],
    "correctAnswerText": "Use Automation Studio query for segmentation and Journey Builder for Messaging and Flow.",
    "explanation": "Automation Studio's SQL Query Activity handles the daily\nsegmentation across multiple data extensions, and Journey Builder manages the\ncomplex multi-message, multi-channel (Email + Mobile) campaign flow — each\ntool doing what it does best. (A) Automation Studio's Messaging and Wait\nActivities are limited and not designed to orchestrate complex multi-channel\ncampaigns with the flexibility that Journey Builder provides. (C) Journey Builder's\nRecurring Entry Source can handle daily entry, but it can't perform the complex\nsegmentation across multiple data extensions that SQL Query in Automation\nStudio provides — it's not the right tool for that part of the requirement."
},
  {
    "id": 52,
    "category": "Marketing Automation",
    "question": "Northern Trail Outfitters is building an automation that should run as soon as a process completes on the company's website. The process does not have access to SFTP. How should the automation be configured to run?",
    "choices": [
        "Schedule the automation to run hourly.",
        "Use a File Drop starting source.",
        "Trigger the automation via API."
    ],
    "correctAnswerText": "Trigger the automation via API.",
    "explanation": "Triggering the automation via API allows the website process to fire\nthe automation instantly upon completion, in real time, without needing SFTP\naccess — a direct programmatic trigger. (A) Scheduling hourly introduces\nunnecessary delay and runs even when no process has completed, making it\ninefficient and not truly event-driven. (B) File Drop requires a file to be placed on\nSFTP to trigger the automation — which is explicitly ruled out since the process\nhas no SFTP access."
},
  {
    "id": 53,
    "category": "Marketing Automation",
    "question": "Northern Trail Outfitters' third-party point-of-sale software uploads order information in batches of large files. The timing varies throughout the day. Which feature should be used to accommodate this setup?",
    "choices": [
        "Wait Activity",
        "Scheduled Automation",
        "Triggered Automation"
    ],
    "correctAnswerText": "Triggered Automation",
    "explanation": "Triggered Automation (File Drop) fires automatically whenever a file is\nuploaded to the SFTP, regardless of timing — perfectly accommodating batch\nuploads that arrive at unpredictable times throughout the day. (A) Wait Activity is a\nstep within an automation that introduces a delay between activities, not a\nmechanism to trigger or start an automation based on file arrivals. (B) Scheduled\nAutomation runs at fixed, predefined times — since the file uploads vary\nthroughout the day, a schedule would either miss files or run unnecessarily when\nno file has arrived."
},
  {
    "id": 54,
    "category": "Marketing Automation",
    "question": "A marketer has created an event confirmation email which is sent to all registrants of their cooking-while-camping sessions. They use Marketing Cloud Connect to integrate to their CRM and want to update records directly when a recipient clicks the 'Confirm RSVP' button. Which automation solution should easily allow this action?",
    "choices": [
        "Journey Builder",
        "Automation Studio",
        "Behavioral Triggers"
    ],
    "correctAnswerText": "Journey Builder",
    "explanation": "It contains native Salesforce Integration activities that can\nimmediately update a record in the core CRM system the moment a subscriber\ninteracts with an email (such as tracking a button click via an Engagement Split)."
},
  {
    "id": 55,
    "category": "Marketing Automation",
    "question": "The marketing team wants to test various paths within a journey based on parameters to assess the effectiveness of a new email campaign. Which tool should be used?",
    "choices": [
        "Path Optimizer",
        "Einstein Engagement Activities",
        "A/B Testing"
    ],
    "correctAnswerText": "Path Optimizer",
    "explanation": "Path Optimizer is a Journey Builder feature specifically designed to\ntest multiple paths within a journey against each other based on defined\nparameters, automatically determining the most effective path and routing the\nremaining audience to the winner. (B) Einstein Engagement Activities use AI to\noptimize send timing or messaging frequency for individual subscribers, but they\ndon't test multiple journey paths against each other. (C) A/B Testing in Email\nStudio tests variations of a single email send (subject line, content, from name),\nnot multiple paths within a journey flow."
},
  {
    "id": 56,
    "category": "Marketing Automation",
    "question": "Northern Trail Outfitters wants to monitor customer status while they flow through a post-purchase journey. Which configuration is required to make decisions on this data?",
    "choices": [
        "The status data is connected to the contact in an attribute group.",
        "The Update Contact Activity is used to make status updates.",
        "The entry source data extension has a primary key and subscriber key."
    ],
    "correctAnswerText": "The status data is connected to the contact in an attribute group.",
    "explanation": "Connecting the status data to the contact via an attribute group in\nContact Builder allows Journey Builder to access and evaluate that data in real\ntime as the contact moves through the journey, enabling decision splits and other\nactivities to act on the latest status. (B) The Update Contact Activity writes data\nchanges during a journey but doesn't enable Journey Builder to read and make\ndecisions on external status data — it's an output action, not a data access\nconfiguration. (C) Having a primary key and subscriber key on the entry source\ndata extension is a basic requirement for any journey entry, but it doesn't by itself\nmake the status data accessible for decision-making within the journey flow."
},
  {
    "id": 57,
    "category": "Marketing Automation",
    "question": "Northern Trail Outfitters sends out 50,000 emails on a Friday. On Monday morning, the marketing team has to go through out-of-office messages and unsubscribe messages to find customer responses to the email. Which feature should help the team?",
    "choices": [
        "Parameter Management",
        "Publication Lists",
        "Reply Mail Management"
    ],
    "correctAnswerText": "Reply Mail Management",
    "explanation": "Reply Mail Management (RMM) automatically processes replies to\nmarketing emails — filtering out out-of-office messages, auto-replies, and\nunsubscribe requests — so the team only sees genuine customer responses\nwithout manually sorting through thousands of inbox replies. (A) Parameter\nManagement deals with tracking parameters added to URLs in emails, not with\nhandling reply emails. (B) Publication Lists are used to manage subscriber opt-in\npreferences for specific types of communications, not for processing inbound\nemail replies."
},
  {
    "id": 58,
    "category": "Marketing Automation",
    "question": "Northern Trail Outfitters'(NTO)website was unable to process coupon codes for several days, which caused customers to complain about their experience. NTO would like to apologize by offering an upgraded coupon to help improve customer satisfaction. What should NTO do to automate the process of finding its affected customers",
    "choices": [
        "Query the data using a specific date range parameter.",
        "Filter the data based on a specific date range.",
        "Use Einstein Engagement scores to identify affected users."
    ],
    "correctAnswerText": "Query the data using a specific date range parameter.",
    "explanation": "A SQL Query Activity with a specific date range parameter can\nprecisely pull all customers who attempted to use coupon codes during the\naffected days from the relevant data extensions — automating the identification\nprocess accurately and at scale. (B) Data Filters can apply a date range condition,\nbut they're limited to a single data source and lack the flexibility to join multiple\ntables or handle complex logic that may be needed to identify affected customers\nacross order and complaint data. (C) Einstein Engagement Scores measure\nsubscriber engagement with emails (opens, clicks), not website transaction\nfailures — they have no way to identify customers affected by a coupon processing\noutage."
},
  {
    "id": 59,
    "category": "Marketing Automation",
    "question": "Northern Trail Outfitters historically received a bulk data file from a vendor once per day in its Marketing Cloud SFTP. The vendor is updating its sending cadence and will be delivering files over approximately eight hours throughout the day. The files will maintain the same naming convention and include a timestamp. Which update should be implemented to the automation to process the files as they are received while minimizing rework?",
    "choices": [
        "Replace the Schedule with File Drop and use a filename pattern.",
        "Implement an API to start an automation with every file transfer.",
        "Replicate the automation and schedule them to execute every eight hours."
    ],
    "correctAnswerText": "Replace the Schedule with File Drop and use a filename pattern.",
    "explanation": "Replacing the scheduled trigger with a File Drop and configuring a\nfilename pattern allows the automation to fire automatically each time any\nmatching file arrives on the SFTP — regardless of timing — requiring minimal\nrework since the rest of the automation stays the same. (B) Using an API to trigger\nthe automation would require the vendor to make API calls on each file transfer,\nadding complexity and dependency on the vendor's technical capabilities — more\nrework, not less. (C) Replicating the automation and scheduling every 8 hours\ndoesn't account for the variable timing of file arrivals throughout the day, and\nmaintaining multiple copies of the same automation increases maintenance\noverhead significantly."
},
  {
    "id": 60,
    "category": "Marketing Automation",
    "question": "Northern Trail Outfitters is hiring a third-party vendor to host a web page tied to a promotional sweepstake. The marketing manager would like an email sent from Journey Builder as soon as the subscriber submits the form. What should be used to enter this subscriber into a journey?",
    "choices": [
        "API Event Entry Source",
        "Contact Event Entry Source",
        "CloudPages Entry Source"
    ],
    "correctAnswerText": "API Event Entry Source",
    "explanation": "The API Event Entry Source allows the third-party vendor's web page\nto fire an API call to Marketing Cloud the moment a subscriber submits the form,\ninstantly injecting them into the journey in real time — perfect for an external,\nvendor-hosted page. (B) Contact Event Entry Source triggers a journey based on\nchanges to a contact record within Marketing Cloud, not from an external third-\nparty form submission. (C) CloudPages Entry Source only works with forms hosted\non Marketing Cloud's own CloudPages — since the page is hosted by a third-party\nvendor, this option isn't applicable."
},
  {
    "id": 61,
    "category": "Marketing Automation",
    "question": "A marketing manager identified an upcoming email campaign for their team to test different subject line voices. They want to first test with a pilot group and then send the winning subject line out to the remaining customers. How should Path Optimizer be configured to handle these requirements?",
    "choices": [
        "Configure a Holdback group to be targeted by the winner.",
        "Place a Random Split before Path Optimizer for the pilot group.",
        "Select winning path three days after journey activation."
    ],
    "correctAnswerText": "Configure a Holdback group to be targeted by the winner.",
    "explanation": "Path Optimizer's Holdback group is specifically designed for this — it\nreserves a portion of the audience (the remaining customers) who don't receive\nany test path during the pilot phase, and once a winning path is determined, the\nholdback group is sent the winner automatically. (B) A Random Split before Path\nOptimizer is unnecessary and adds complexity — Path Optimizer natively handles\naudience splitting for the test group internally, without needing a separate activity\nto isolate a pilot group. (C) Selecting a winning path three days after activation is a\nmanual action, not a configuration — and it doesn't address the requirement of\nholding back the remaining audience for the winner send."
},
  {
    "id": 62,
    "category": "Marketing Automation",
    "question": "A healthcare marketer would like an email sent to patients as soon as they request a password reset for their account. Which journey type is the best solution for the marketer to set up?",
    "choices": [
        "Single Send Journey",
        "Multi-Step Journey",
        "Transactional Send Journey"
    ],
    "correctAnswerText": "Transactional Send Journey",
    "explanation": "A Transactional Send Journey is purpose-built for real-time, 1:1\ntriggered messages like password resets — it fires immediately via API when the\nevent occurs, delivers reliably regardless of subscription status, and is designed\nfor time-sensitive operational emails. (A) Single Send Journey is for one-time\nbatch marketing sends to a defined audience, not for real-time individually\ntriggered transactional messages. (B) Multi-Step Journey supports complex flows\nwith multiple activities and waits, which is unnecessary overhead for a simple\nimmediate password reset email — and it lacks the real-time API trigger reliability\nof a Transactional Send Journey."
},
  {
    "id": 63,
    "category": "Marketing Automation",
    "question": "Northern Trail Outfitters (NTO) wants to implement a single-audience drip campaign and then, over time, create new versions with tests of random audience splits with different messages. Which tool should NTO use to accomplish these iterative tests?",
    "choices": [
        "Contact Builder",
        "Automation Studio",
        "Journey Builder"
    ],
    "correctAnswerText": "Journey Builder",
    "explanation": "Journey Builder supports versioning, allowing NTO to create new\nversions of the same journey over time with updated random splits and different\nmessages — making it ideal for iterative testing of a drip campaign without\nrebuilding from scratch. (A) Contact Builder is a data management tool for\ndefining relationships between data sources and contact records — it has no\ncampaign execution or testing capabilities. (B) Automation Studio can orchestrate\nsends but has no versioning, random split testing, or journey flow capabilities —\nit's not designed for iterative audience split testing across campaign versions."
},
  {
    "id": 64,
    "category": "Marketing Automation",
    "question": "The data team at Northern Trail Outfitters wants to send a daily report of all subscribers emailed in the last 24 hours to their Enhanced FTP Export folder. The file should contain unique email addresses. At a minimum, which activities should be configured in Automation Studio to meet their requirements?",
    "choices": [
        "Filter, Data Extract, File Transfer",
        "SQL Query, Data Extract, File Transfer",
        "SQL Query, Filter, Data Extract"
    ],
    "correctAnswerText": "SQL Query, Data Extract, File Transfer",
    "explanation": "A SQL Query Activity pulls unique email addresses from the last 24\nhours of sends (joining data views as needed), the Data Extract generates the file\nfrom that output, and the File Transfer moves it to the Enhanced FTP Export folder\n— covering all three requirements precisely. (A) A Filter Activity can apply date-\nbased conditions but can't query across data views or guarantee deduplication of\nemail addresses the way SQL can — it's too limited for this use case. (C) This\ncombination is missing the File Transfer activity, meaning the extracted file would\nnever actually be delivered to the Enhanced FTP Export folder — an incomplete\nsolution."
},
  {
    "id": 65,
    "category": "Marketing Automation",
    "question": "Northern Trail Outfitters (NTO) has an upcoming campaign with a call to action to shop its new NTO outlet store. The campaign will need to send up to three emails but stop sending to each specific subscriber once they have made a purchase at the NTO outlet, and provide reporting on the success of the campaign. Which Journey Builder component addresses the two requirements of this campaign?",
    "choices": [
        "Goals",
        "Exits",
        "Decision Splits"
    ],
    "correctAnswerText": "Goals",
    "explanation": "Goals serve dual purpose here — they remove contacts from the\njourney as soon as they make a purchase (stopping further emails to that\nsubscriber), and they provide built-in reporting on how many contacts achieved\nthe goal, directly addressing both the stop-sending and reporting requirements.\n(B) Exits remove contacts from the journey based on criteria but provide no\ncampaign success reporting — they only address one of the two requirements. (C)\nDecision Splits branch contacts down different paths based on conditions but\ndon't stop the journey for a contact who converts, nor do they provide campaign-\nlevel success reporting."
},
  {
    "id": 66,
    "category": "Marketing Automation",
    "question": "Every day, Northern Trail Outfitters (NTO) adds to a data extension with purchasers of a new luxury cooler line. To give these customers a high-end purchasing experience, NTO wants to send a customized 'congratulations' email the day they are posted in the data extension, and follow up with a review request 14 days later. Which automation solutions should be set up to accommodate this request?",
    "choices": [
        "Journey Builder and Behavioral Triggers",
        "Automation Studio and Journey Builder",
        "Automation Studio and Path Optimizer"
    ],
    "correctAnswerText": "Automation Studio and Journey Builder",
    "explanation": "Automation Studio detects the daily data extension updates and\ninjects new contacts into a Journey Builder journey, which then sends the\ncongratulations email immediately on entry and automatically follows up with the\nreview request after a 14-day wait activity — each tool handling what it does best.\n(A) Behavioral Triggers fire based on email engagement actions (opens, clicks),\nnot on data extension record additions — so they can't detect when a new\npurchaser is posted to the data extension. (C) Path Optimizer is for testing\nmultiple journey paths to find a winner — there's no testing requirement here, just\na two-step sequential send flow that Journey Builder handles natively."
},
  {
    "id": 67,
    "category": "Marketing Automation",
    "question": "A marketer wants to use a filter to create a data extension that includes only records from yesterday, Which step should they take to ensure the data extension includes newly added records?",
    "choices": [
        "Check the 'AUTOMATICALLY REFRESH UPON SENDING' checkbox.",
        "Configure the filter DE to auto-refresh daily in properties.",
        "Schedule an automation to refresh the filter activity each day."
    ],
    "correctAnswerText": "Schedule an automation to refresh the filter activity each day.",
    "explanation": "Scheduling an Automation Studio automation with a Filter Activity to\nrun daily ensures the data extension is refreshed each day with the previous day's\nrecords automatically and reliably. (A) \"Automatically Refresh Upon Sending\" only\nre-runs the filter at send time, not on a daily standalone basis — it doesn't\nguarantee the DE is updated independently of a send. (B) There is no native \"auto-\nrefresh daily\" property setting on a filtered data extension — this isn't a real\nconfiguration option in Marketing Cloud.\nAnswer: (B) Content Builder Approvals is the actual built-in feature in Marketing"
},
  {
    "id": 68,
    "category": "Marketing Automation",
    "question": "A marketer needs to send emails to the creative team for proofing as part of an email campaign. Which feature should help achieve this as an automatic flow?",
    "choices": [
        "Subscriber Preview",
        "Content Builder Approvals",
        "Approval Workflow"
    ],
    "correctAnswerText": "Content Builder Approvals",
    "explanation": "Scheduling an Automation Studio automation with a Filter Activity to\nrun daily ensures the data extension is refreshed each day with the previous day's\nrecords automatically and reliably. (A) \"Automatically Refresh Upon Sending\" only\nre-runs the filter at send time, not on a daily standalone basis — it doesn't\nguarantee the DE is updated independently of a send. (B) There is no native \"auto-\nrefresh daily\" property setting on a filtered data extension — this isn't a real\nconfiguration option in Marketing Cloud.\nAnswer: (B) Content Builder Approvals is the actual built-in feature in Marketing"
},
  {
    "id": 69,
    "category": "Marketing Automation",
    "question": "When building an email audience, a marketer first runs a query to update a data extension referenced in the audience query. Which configuration should be used to ensure the exclusion is updated before the audience query runs?",
    "choices": [
        "Place the audience SQL Query Activity in a step after the exclusion SQL Query Activity.",
        "In the step with the two SQL activities, place a wait step between them.",
        "Place the audience SQL Query Activity below the exclusion SQL Query Activity."
    ],
    "correctAnswerText": "Place the audience SQL Query Activity in a step after the exclusion SQL Query Activity.",
    "explanation": "Cloud that enables a structured approval process — allowing marketers to submit\nemails for review, notifying the creative team automatically, and requiring sign-off\nbefore sending. (A) Subscriber Preview is a manual rendering tool, not an approval\nor proofing workflow. (C) \"Approval Workflow\" is not a distinct Marketing Cloud\nfeature — it's just a generic term that describes what Content Builder Approvals\ndoes, making B the precise, correct answer.\nAnswer: (A) In Automation Studio, activities within the same step run in parallel,\nwhile activities in separate sequential steps run in order — placing the audience\nquery in a step after the exclusion query guarantees the exclusion data extension\nis fully updated before the audience query runs. (B) A wait step introduces a time\ndelay but doesn't ensure the exclusion query has completed — it's an unreliable\nway to sequence dependent queries. (C) Placing activities \"below\" each other in\nthe same step still runs them in parallel, not sequentially — the exclusion query is\nnot guaranteed to finish first."
},
  {
    "id": 70,
    "category": "Marketing Automation",
    "question": "Northern Trail Outfitters(NTO)wants to send out three emails in Automation Studio. However, NTO wants to ensure each email is fully sent before the next email begins sending. How should the automation workflow be built to accomplish this?",
    "choices": [
        "Add each Send Email activity to a single step in an automation.",
        "Include a Verification activity between each step of an automation.",
        "Add each Send Email activity to different steps in an automation."
    ],
    "correctAnswerText": "Add each Send Email activity to different steps in an automation.",
    "explanation": "Placing each Send Email activity in its own separate step ensures\nAutomation Studio completes each step fully before moving to the next,\nguaranteeing sequential execution. (A) Adding all three activities to a single step\ncauses them to run in parallel simultaneously, not one after another. (B) There is\nno native \"Verification activity\" in Automation Studio — this is not a real feature.\nAnswer: (A) Creating a separate Entry Source for each channel (one for email opt-\nins, one for SMS opt-ins) allows Journey Builder to route subscribers into the"
},
  {
    "id": 71,
    "category": "Marketing Automation",
    "question": "Northern Trail Outfitters (NTO) has subscribers opt-in to its marketing program via email or SMS. What should NTO configure for its welcome series in Journey Builder to honor the opt-in communication method?",
    "choices": [
        "Create one Entry Source for each messaging channel.",
        "Ensure source channel is available in subscriber data.",
        "Send both email and SMS to ensure subscribers get NTO's messages."
    ],
    "correctAnswerText": "Create one Entry Source for each messaging channel.",
    "explanation": "Placing each Send Email activity in its own separate step ensures\nAutomation Studio completes each step fully before moving to the next,\nguaranteeing sequential execution. (A) Adding all three activities to a single step\ncauses them to run in parallel simultaneously, not one after another. (B) There is\nno native \"Verification activity\" in Automation Studio — this is not a real feature.\nAnswer: (A) Creating a separate Entry Source for each channel (one for email opt-\nins, one for SMS opt-ins) allows Journey Builder to route subscribers into the"
},
  {
    "id": 72,
    "category": "Marketing Automation",
    "question": "A marketer has built a journey that they want to run multiple times a day after new data is compiled. The data is NOT in an attribute group in Contact Builder. What should the marketer do in order to accomplish this?",
    "choices": [
        "Select the Recurring schedule type for the entry source in Journey Builder.",
        "Schedule and activate Triggered Sends for the messages in the journey.",
        "Select an automation to populate the Entry Source Data Extension."
    ],
    "correctAnswerText": "Select an automation to populate the Entry Source Data Extension.",
    "explanation": "appropriate welcome series based on how they opted in, ensuring each subscriber\nonly receives communications through their chosen channel. (B) Having the\nsource channel in subscriber data is a prerequisite, but alone it doesn't configure\nthe journey to honor the opt-in method — you still need the entry sources and\nchannel-specific paths set up. (C) Sending both email and SMS to all subscribers\nregardless of their opt-in channel violates their communication preferences and\ncould breach consent regulations.\nAnswer: (C) Since the data is not in an attribute group, an Automation Studio\nautomation must populate the Entry Source Data Extension with the new compiled\ndata each time before the journey runs — this is the correct way to feed fresh data\ninto a journey when Contact Builder attribute groups aren't being used. (A)\nRecurring schedule on the entry source works when data is already available in a\nconnected data extension or attribute group, but it doesn't solve the problem of\ngetting the newly compiled data into the entry source in the first place. (B)\nTriggered Sends are for 1:1 real-time messages fired by API events, not for running\na full journey multiple times a day based on batch data updates."
},
  {
    "id": 73,
    "category": "Marketing Automation",
    "question": "A healthcare company imports its patient portal registrations at the parent level business unit(BU).The marketing team would like to ensure individual office locations have access to this data without giving access to the parent level BU. What should the marketing team do in Automation Studio to ensure data is available at the child BU level?",
    "choices": [
        "After the file import, use the filter activity to populate shared data extensions that are available to child BUs.",
        "After the file import, use the transfer file activity to move data into data extensions in child BUs.",
        "Create automations that import the data directly into the child BUs to bypass the parent level BU."
    ],
    "correctAnswerText": "After the file import, use the filter activity to populate shared data extensions that are available to child BUs.",
    "explanation": "After importing at the parent BU, a Filter Activity can segment and\npopulate Shared Data Extensions — which are accessible by child BUs — making\nthe data available to individual office locations without granting them access to\nthe parent BU itself. (B) The Transfer File Activity moves files between SFTP\nlocations, not data between business units or into data extensions — it's the wrong\ntool for this use case. (C) Importing directly into child BUs would require separate\nfile imports and automations for each location, which is inefficient and doesn't\nleverage the centralized parent BU import that's already in place."
},
  {
    "id": 74,
    "category": "Marketing Automation",
    "question": "A marketer wants to store all the attributes for a triggered send within a data extension. Which configuration is required when creating the data extension?",
    "choices": [
        "Select the 'Use for triggered send' checkbox.",
        "Include Subscriber key and Email address field as primary key.",
        "Create from template and choose triggered send template."
    ],
    "correctAnswerText": "Create from template and choose triggered send template.",
    "explanation": "When you create a Data Extension using the\nTriggeredSendDataExtension template, Marketing Cloud automatically injects\nthe required fields (like SubscriberKey and EmailAddress) along with the exact\nunderlying database structure necessary for the Triggered Send API engine to\nappend data extension records as subscribers trigger emails.\nAnswer: (C) Regularly importing subscriber data and keeping key data extensions\nup to date is the foundational first step for any email marketing automation —\nwithout accurate, fresh data, no other automation can function effectively. (A)\nDeleting old data extensions, emails, and reports is a maintenance task, not a\nstrategic first automation step — and it carries risk if done before understanding"
},
  {
    "id": 75,
    "category": "Marketing Automation",
    "question": "Northern Trail Outfitters (NTO) wants to add automation to its email marketing. Which automation should NTO create as a good first step?",
    "choices": [
        "An automation that deletes old data extensions, emails, and reports",
        "An automation that contains several recurring emails and decisioning points",
        "An automation that imports subscriber data regularly and updates key data extensions"
    ],
    "correctAnswerText": "An automation that imports subscriber data regularly and updates key data extensions",
    "explanation": "When you create a Data Extension using the\nTriggeredSendDataExtension template, Marketing Cloud automatically injects\nthe required fields (like SubscriberKey and EmailAddress) along with the exact\nunderlying database structure necessary for the Triggered Send API engine to\nappend data extension records as subscribers trigger emails.\nAnswer: (C) Regularly importing subscriber data and keeping key data extensions\nup to date is the foundational first step for any email marketing automation —\nwithout accurate, fresh data, no other automation can function effectively. (A)\nDeleting old data extensions, emails, and reports is a maintenance task, not a\nstrategic first automation step — and it carries risk if done before understanding"
},
  {
    "id": 76,
    "category": "Marketing Automation",
    "question": "After sending an initial 'welcome' email, Northern Trail Outfitters needs to configure Journey Builder to continue a customer acquisition journey after a purchase is made on its website. Which type of activity should be used?",
    "choices": [
        "Wait Until Event",
        "Behavioral Trigger",
        "Engagement Split"
    ],
    "correctAnswerText": "Wait Until Event",
    "explanation": "what data is still needed. (B) A complex automation with multiple recurring emails\nand decisioning points is too advanced as a first step; it requires clean, reliable\ndata to already be in place before building out that kind of logic.\nAnswer: (A) Wait Until Event pauses the contact's progression in the journey until\na specific event occurs — in this case, a website purchase — and then continues\nthe journey once that event is detected, making it the right tool to connect the\nwelcome email to post-purchase steps. (B) Behavioral Triggers fire a new journey\nbased on email engagement (opens/clicks), not on external website events like a\npurchase — they can't listen for a transaction on NTO's website. (C) Engagement\nSplit branches contacts based on whether they opened or clicked an email, not\nbased on whether they made a purchase on the website."
},
  {
    "id": 77,
    "category": "Marketing Automation",
    "question": "Northern Trail Outfitters uses an automation to process and report sales agents' weekly data extensions. All sales agents' data is needed for the automation's created report to be correct. Some agents have not been creating their data extensions in time. Which step prevents the automation from completing the automation instance and delivering an inaccurate report?",
    "choices": [
        "Verification Activity",
        "Wait Activity",
        "Data Extract Activity"
    ],
    "correctAnswerText": "Verification Activity",
    "explanation": "Verification Activity checks that specified conditions are met — such\nas all required data extensions being present and populated — before allowing the\nautomation to proceed, stopping it if any agent's data is missing and preventing an\ninaccurate report from being generated. (B) Wait Activity simply pauses the\nautomation for a set amount of time; it doesn't check whether data conditions are\nmet or halt execution based on missing data. (C) Data Extract Activity exports data\ninto a file — it's an output step that runs after data is processed, not a gate that\nvalidates data completeness before the automation continues."
},
  {
    "id": 78,
    "category": "Marketing Automation",
    "question": "Northern Trail Outfitters (NTO) is building a welcome journey for new customers with dynamic content in each email. NTO would like to have content personalized for each customer and include assets based on real-time analysis of what is performing the best for other customers. Which feature should NTO use?",
    "choices": [
        "Einstein Content Selection",
        "Einstein Copy Insights",
        "Enhanced Dynamic Content"
    ],
    "correctAnswerText": "Einstein Content Selection",
    "explanation": "Einstein Content Selection uses AI to analyze real-time performance\ndata and automatically selects the best-performing content asset for each\nindividual customer at send time — directly matching the requirement for both\nindividual personalization and real-time performance-based asset selection. (B)\nEinstein Copy Insights analyzes subject line language and writing style to suggest\nimprovements, but it doesn't personalize content assets or make real-time\nperformance-based selections. (C) Enhanced Dynamic Content swaps content\nbased on predefined data rules, but it's rule-based and static — it doesn't analyze\nreal-time performance across customers to determine which assets are\nperforming best."
},
  {
    "id": 79,
    "category": "Marketing Automation",
    "question": "Northern Trail Outfitters (NTO) wants to leverage Path Optimizer to test new marketing content. The best path will be selected based on the orders placed on NTO's website. What should NTO configure in Path Optimizer?",
    "choices": [
        "Manual Engagement",
        "Email Engagement",
        "Web Conversion"
    ],
    "correctAnswerText": "Web Conversion",
    "explanation": "Web Conversion is the Path Optimizer winning criteria that measures\nconversions based on website activity — like orders placed — making it the right\nmetric to determine the best-performing path based on actual purchases. (A)\nManual Engagement requires a human to review results and manually select the\nwinner, rather than letting the system determine it based on website order data.\n(B) Email Engagement measures email-level interactions like opens and clicks, not\nwebsite conversions — it wouldn't capture whether a path actually drove\npurchases on NTO's website."
},
  {
    "id": 80,
    "category": "Marketing Automation",
    "question": "A marketer has built an automation using Automation Studio to send data from a data extension to the SFTP as a .csv file. The automation includes a data extract and completes successfully, but the file is still not showing up on the SFTP. Which activity is missing?",
    "choices": [
        "File Transfer",
        "Fire Event",
        "Import File"
    ],
    "correctAnswerText": "File Transfer",
    "explanation": "The Data Extract generates the .csv file and places it in the Marketing\nCloud safehouse (an internal storage location), but a File Transfer Activity is\nrequired to actually move it from the safehouse to the SFTP — without it, the file\nnever reaches its destination. (B) Fire Event triggers a Journey Builder entry event\nand has nothing to do with file management or SFTP transfers. (C) Import File\nmoves data from SFTP into Marketing Cloud data extensions — it works in the\nopposite direction of what's needed here."
},
  {
    "id": 81,
    "category": "Subscriber & Data Management",
    "question": "A marketer needs to send emails to all 20 members of the creative team for proofing as part of an email campaign. Which Preview & Test Content Personalization option should be used?",
    "choices": [
        "Based on Subscriber Preview List or Data Extension",
        "Based on Preview",
        "Based on Recipient Test Data Extension"
    ],
    "correctAnswerText": "Based on Recipient Test Data Extension",
    "explanation": "A Recipient Test Data Extension lets you store a list of specific internal\nrecipients (the 20 creative team members) and send the proof email to all of them\nat once — purpose-built for sending test emails to a defined group. (A) Subscriber\nPreview List or Data Extension is used for previewing how an email renders for\nspecific subscribers, not for actually sending test emails to a group of recipients.\n(B) \"Based on Preview\" only renders a visual preview of the email for a single\nsubscriber — it doesn't send anything to anyone."
},
  {
    "id": 82,
    "category": "Subscriber & Data Management",
    "question": "Northern Trail Outfitters (NTO) wants to use Marketing Cloud's Subscription Center to allow subscribers to control which types of emails they do NOT want to receive. NTO's audiences are contained in data extensions. Which object should be used?",
    "choices": [
        "Suppression Lists",
        "Publication Lists",
        "Exclusion Lists"
    ],
    "correctAnswerText": "Publication Lists",
    "explanation": "Publication Lists are the object used in the Subscription Center to let\nsubscribers manage their email preferences — they represent specific types of\ncommunications subscribers can opt in or out of, and they work with data\nextension-based audiences. (A) Suppression Lists exclude contacts from receiving\nspecific sends, but they're marketer-controlled, not subscriber-controlled —\nsubscribers can't manage them themselves through the Subscription Center. (C)\nExclusion Lists are used at the send or business unit level to exclude certain\ncontacts, not a subscriber-facing preference management tool available in the\nSubscription Center."
},
  {
    "id": 83,
    "category": "Subscriber & Data Management",
    "question": "The marketing team wants to split their primary customer data extension into 10 separate segments, to use for future A/B testing scenarios. Which feature should be used to easily segment the data extension?",
    "choices": [
        "Filter Data Activity",
        "Random Data Extension",
        "SQL query activity"
    ],
    "correctAnswerText": "Random Data Extension",
    "explanation": "Random Data Extension is specifically designed to split a data\nextension into a defined number of equally randomized segments — making it the\neasiest way to divide the audience into 10 groups for A/B testing without manual\nSQL logic. (A) Filter Data Activity segments based on specific attribute conditions,\nnot random equal splits — it can't divide an audience into 10 randomized portions\nfor testing purposes. (C) SQL Query Activity could technically achieve this with\ncomplex logic, but it's not the easy, purpose-built solution — Random Data\nExtension handles it natively with no coding required."
},
  {
    "id": 84,
    "category": "Subscriber & Data Management",
    "question": "A marketing manager wants to import the Not Sent extract into a data extension to leverage as an exclusion audience. Which steps should be configured within Automation Studio to accomplish this?",
    "choices": [
        "Tracking Extract>Import Activity>SQL Activity",
        "Tracking Extract>File Transfer>Import Activity",
        "Tracking Extract>Import Activity>Data Extension Extract"
    ],
    "correctAnswerText": "Tracking Extract>File Transfer>Import Activity",
    "explanation": "The Tracking Extract pulls the Not Sent data as a file to the Marketing\nCloud safehouse, the File Transfer moves it to the SFTP, and the Import Activity\nbrings it from SFTP into the data extension — this is the correct three-step flow for\ngetting tracking extract data into a usable data extension. (A) A SQL Activity after\nthe Import is unnecessary here — the data is already clean and structured from the\nextract, and no transformation or joining is needed to use it as an exclusion\naudience. (C) A Data Extension Extract at the end exports data out of a data\nextension, which is the opposite of what's needed — the goal is to get data into a\ndata extension, not extract from one."
},
  {
    "id": 85,
    "category": "Subscriber & Data Management",
    "question": "Northern Trail Outfitters wants to utilize an Amazon s3 bucket to import data into Marketing Cloud Data Extensions. What should be used to achieve this?",
    "choices": [
        "Import Activity",
        "Import Wizard",
        "Ingest API"
    ],
    "correctAnswerText": "Ingest API",
    "explanation": "The Ingest API is designed to import data from external cloud storage\nsources like Amazon S3 directly into Marketing Cloud Data Extensions — it's the\npurpose-built solution for this use case. (A) Import Activity pulls files from\nMarketing Cloud's own SFTP or safehouse, not directly from external cloud\nstorage like Amazon S3. (B) Import Wizard is a manual, one-time import tool for\nuploading files directly in the UI — it doesn't support automated or external cloud\nstorage connections like S3.\nAnswer: (C) A Filter Activity in Automation Studio re-runs the filter criteria and\nrefreshes the filtered data extension on a scheduled basis — it's the native,"
},
  {
    "id": 86,
    "category": "Subscriber & Data Management",
    "question": "A marketer for Northern Trail Outfitters needs to automatically refresh a filtered data extension prior to sending a daily email. What should a marketer do to automatically refresh a filtered data extension on a scheduled basis?",
    "choices": [
        "Configure the Send Activity to automate the refresh.",
        "Activate Journey Builder to refresh the data extension.",
        "Use a Filter Activity in Automation Studio."
    ],
    "correctAnswerText": "Use a Filter Activity in Automation Studio.",
    "explanation": "The Ingest API is designed to import data from external cloud storage\nsources like Amazon S3 directly into Marketing Cloud Data Extensions — it's the\npurpose-built solution for this use case. (A) Import Activity pulls files from\nMarketing Cloud's own SFTP or safehouse, not directly from external cloud\nstorage like Amazon S3. (B) Import Wizard is a manual, one-time import tool for\nuploading files directly in the UI — it doesn't support automated or external cloud\nstorage connections like S3.\nAnswer: (C) A Filter Activity in Automation Studio re-runs the filter criteria and\nrefreshes the filtered data extension on a scheduled basis — it's the native,"
},
  {
    "id": 87,
    "category": "Subscriber & Data Management",
    "question": "Northern Trail Outfitters(NTO)notices that some of its unsubscribe reasons are related to Reply Mail Management (RMM).NTO does not have RMM in its account. What contributes to these unsubscribe reasons?",
    "choices": [
        "Profile Center Unsubscribe",
        "List Unsubscribe header",
        "Universal Unsubscribe"
    ],
    "correctAnswerText": "List Unsubscribe header",
    "explanation": "purpose-built way to keep a filtered DE up to date automatically before a daily\nsend. (A) The Send Activity executes the email send itself; it doesn't have the\ncapability to refresh or repopulate a filtered data extension as part of its\nconfiguration. (B) Journey Builder manages contact flows and messaging\nsequences but has no functionality to refresh or repopulate a filtered data\nextension.\nAnswer: (B) The List Unsubscribe header is a one-click unsubscribe mechanism\nbuilt into the email client (like Gmail or Outlook) that processes unsubscribes\nthrough a mailto reply — without RMM configured to handle those reply emails,\nMarketing Cloud still logs them as RMM-related unsubscribes. (A) Profile Center\nUnsubscribe is processed directly through Marketing Cloud's Subscription Center\nUI, not through reply mail — it wouldn't generate RMM-attributed unsubscribe\nreasons. (C) Universal Unsubscribe opts a subscriber out of all emails globally and\nis processed within Marketing Cloud itself, not through reply mail handling."
},
  {
    "id": 88,
    "category": "Subscriber & Data Management",
    "question": "Northern Trail Outfitters allows non-registered customers to provide a phone number for open orders. The provided contact information is to be deleted after 30 days.Which feature provides a way to automatically maintain a data extension's records?",
    "choices": [
        "Data Retention Policy",
        "Delete Filter Activity",
        "Contact Delete"
    ],
    "correctAnswerText": "Data Retention Policy",
    "explanation": "Data Retention Policy is configured directly on a data extension to\nautomatically delete records after a specified period — setting a 30-day retention\npolicy ensures the contact information is purged automatically without any manual\nintervention. (B) Delete Filter Activity can remove records matching filter criteria,\nbut it requires an automation to run it on a schedule — it's not a self-contained\nautomatic maintenance feature built into the data extension itself. (C) Contact\nDelete removes contacts from the Marketing Cloud Contact model entirely across\nall business units, which is far more broad and destructive than simply clearing\nrecords from a single data extension after 30 days."
},
  {
    "id": 89,
    "category": "Subscriber & Data Management",
    "question": "Northern Trail Outfitters(NTO)is designing a journey for its Platinum loyalty members. There are more than 2 million NTO loyalty members, but only 100,000 of them qualify as Platinum. NTO stores all loyalty member information in a single data extension. What is the optimal segmentation process that NTO should use to ensure only Platinum members receive the journey emails?",
    "choices": [
        "Use Automation Studio to query a population into a data extension.",
        "Use Filter Contacts criteria in the journey entry source.",
        "Use a Decision Split activity on the journey canvas."
    ],
    "correctAnswerText": "Use Automation Studio to query a population into a data extension.",
    "explanation": "Using a SQL Query Activity in Automation Studio to extract only\nPlatinum members into a separate data extension before journey entry is the\noptimal approach for a 2 million+ record dataset — it's efficient, precise, and\nensures only the 100,000 qualified contacts enter the journey. (B) Filter Contacts\ncriteria on the entry source can work for simple filters, but it's less performant and\nreliable at this scale compared to a pre-processed SQL query on a large data\nextension. (C) A Decision Split evaluates contacts after they've already entered\nthe journey — all 2 million members would enter first and then be branched, which\nis inefficient and wastes journey processing resources."
},
  {
    "id": 90,
    "category": "Subscriber & Data Management",
    "question": "When reviewing spam complaints from recent email sends, a marketer from Northern Trail Outfitters(NTO) identifies an email address that has consistently marked promotional email messages from NTO as spam. What should the marketer do to prevent the subscriber from receiving further commercial messages?",
    "choices": [
        "Use the complaint exclusion list on future sends.",
        "Delete the subscriber from All Subscribers.",
        "Add the subscriber to the auto-suppression list."
    ],
    "correctAnswerText": "Add the subscriber to the auto-suppression list.",
    "explanation": "Es la herramienta ideal en Salesforce Marketing Cloud para prevenir\nde forma proactiva que direcciones de correo electrónico específicas reciban\ncomunicaciones de tipo comercial.\nAnswer: (B) A field marked as Primary Key uniquely identifies each record in the\ndata extension, and when a SQL Query Activity runs with an \"Update\" or \"Upsert\"\naction, it uses the Primary Key to match incoming records to existing ones —"
},
  {
    "id": 91,
    "category": "Subscriber & Data Management",
    "question": "Northern Trail Outfitters is building a data extension that will store preference data for its subscribers. Which setting should be enabled to allow an SQL Query Activity to update the data extension?",
    "choices": [
        "Nullable",
        "Primary Key",
        "Is Sendable"
    ],
    "correctAnswerText": "Primary Key",
    "explanation": "Es la herramienta ideal en Salesforce Marketing Cloud para prevenir\nde forma proactiva que direcciones de correo electrónico específicas reciban\ncomunicaciones de tipo comercial.\nAnswer: (B) A field marked as Primary Key uniquely identifies each record in the\ndata extension, and when a SQL Query Activity runs with an \"Update\" or \"Upsert\"\naction, it uses the Primary Key to match incoming records to existing ones —"
},
  {
    "id": 92,
    "category": "Subscriber & Data Management",
    "question": "Northern Trail Outfitters wants to ensure a group of subscribers never receives a promotional email. Which configuration ensures these subscribers do NOT receive these emails?",
    "choices": [
        "Configure Auto-Suppression list for the Commercial classification.",
        "Add subscribers to the Account opt-out list.",
        "Add an Auto-Suppression list to the default sender profile."
    ],
    "correctAnswerText": "Configure Auto-Suppression list for the Commercial classification.",
    "explanation": "without it, the query can't determine which records to update. (A) Nullable simply\nmeans a field is allowed to contain no value, which has no bearing on whether a\nSQL query can write to the data extension. (C) Is Sendable designates the data\nextension as usable for email sends by linking a subscriber key field to All\nSubscribers — it's about send eligibility, not about enabling data writes from a\nquery activity.\nAnswer: (A) Configuring an Auto-Suppression list scoped to the Commercial\nclassification ensures those subscribers are automatically excluded from every\npromotional/commercial send across the account — it's the most precise and\nreliable way to block a specific group from that email type. (B) adding subscribers\nto the Account opt-out list globally unsubscribes them from all email types\n(commercial and transactional), which is heavier-handed than needed and could\nblock messages the subscriber still wants. (C) attaching an Auto-Suppression list\nto a default sender profile ties suppression to a specific sender identity rather than\nthe email classification, so it wouldn't consistently cover all promotional sends if\nmultiple sender profiles are in use."
},
  {
    "id": 93,
    "category": "Subscriber & Data Management",
    "question": "Northern Trail Outfitters wants multiple business units to access the same data extension within its Enterprise 2.0 account. Where should the data extension reside to achieve this goal?",
    "choices": [
        "In the Synchronized Data Extensions folder",
        "In the Data Extensions folder with sharing enabled",
        "In the Shared Data Extensions folder"
    ],
    "correctAnswerText": "In the Shared Data Extensions folder",
    "explanation": "In an Enterprise 2.0 account, data extensions placed in the Shared\nData Extensions folder at the parent business unit level are accessible to all child\nbusiness units — this is the purpose-built location for cross-BU data sharing. (A)\nthe Synchronized Data Extensions folder is specifically for data synced from Sales/\nService Cloud via Marketing Cloud Connect; it's not a general-purpose sharing\nmechanism between business units. (B) there is no native \"sharing enabled\"\ntoggle on a standard Data Extensions folder — simply placing a DE in a regular\nfolder doesn't make it accessible across business units; it must be in the\ndesignated Shared Data Extensions folder."
},
  {
    "id": 94,
    "category": "Subscriber & Data Management",
    "question": "A customer requested Northern Trail Outfitters NOT record any clicks or opens performed by them. What should be configured to ensure compliance with this request?",
    "choices": [
        "DoNotTrack Attribute",
        "Exclusion Script",
        "Consent Management"
    ],
    "correctAnswerText": "DoNotTrack Attribute",
    "explanation": "The DoNotTrack attribute is a subscriber-level attribute in SFMC that,\nwhen set to true, instructs the platform to stop recording opens and clicks for that\nspecific subscriber — it's the exact tool designed for this compliance use case. (B)\nan Exclusion Script is used to exclude subscribers from receiving a send\naltogether, not to suppress engagement tracking for subscribers who do receive\nemails. (C) Consent Management is a broader framework for managing\nsubscription preferences and opt-in/opt-out status — it controls whether\nsubscribers receive emails, not whether their engagement activity is tracked."
},
  {
    "id": 95,
    "category": "Subscriber & Data Management",
    "question": "A marketer needs a quick count of records in a data extension with 'Djibouti' as the value for Country. What should they use to determine the number of matching records in the least amount of steps?",
    "choices": [
        "SQL Query",
        "Data Filter",
        "Filtered data extension"
    ],
    "correctAnswerText": "Filtered data extension",
    "explanation": "If the goal is the least steps, (C) Filtered Data Extension is actually the most\ndirect path: you create it by applying a filter condition (Country = 'Djibouti')\ndirectly on the source DE, and it immediately shows you the record count. A Data\nFilter (B) is essentially just the filter criteria — it doesn't display a count on its own\nwithout being applied somewhere. And SQL Query (A) still requires the most\nsteps.\nAnswer: (C) Creating a data filter directly on the data extension is the low-code"
},
  {
    "id": 96,
    "category": "Subscriber & Data Management",
    "question": "An insurance company has launched a new campaign to target individuals between 64 and 65 that are not yet enrolled and are opted into email. All subscriber data is stored in one data extension. How should the marketer use low-code to create this segment?",
    "choices": [
        "Write a query to create a filtered data extension.",
        "Filter the .csv file before import.",
        "Create a data filter on the data extension."
    ],
    "correctAnswerText": "Create a data filter on the data extension.",
    "explanation": "If the goal is the least steps, (C) Filtered Data Extension is actually the most\ndirect path: you create it by applying a filter condition (Country = 'Djibouti')\ndirectly on the source DE, and it immediately shows you the record count. A Data\nFilter (B) is essentially just the filter criteria — it doesn't display a count on its own\nwithout being applied somewhere. And SQL Query (A) still requires the most\nsteps.\nAnswer: (C) Creating a data filter directly on the data extension is the low-code"
},
  {
    "id": 97,
    "category": "Subscriber & Data Management",
    "question": "Northern Trail Outfitters (NTO) wants to include specific content for its most engaged customers and different content for its least engaged customers. Which Journey Builder activity should NTO use?",
    "choices": [
        "Scoring Split",
        "Frequency Split",
        "Engagement Split"
    ],
    "correctAnswerText": "Scoring Split",
    "explanation": "approach — you use the point-and-click filter UI to set conditions (age between\n64–65, not enrolled, opted into email) without writing any code, producing the\nsegment from the existing DE. (A) writing a SQL query is a code solution, which\ndirectly contradicts the \"low-code\" requirement in the question. (B) filtering the\nCSV before import is a manual, upstream process that would need to be repeated\nevery time the data is refreshed — it's not a reusable or scalable in-platform\nsegmentation method.\nEsta actividad utiliza los datos predictivos de Einstein Engagement Scoring para\nsegmentar a los clientes en el canvas de Journey Builder. Permite dividir los\ncaminos de los contactos basándose en su nivel de interacción predecible\n(personas), lo cual es ideal para separar de manera automatizada a los clientes\nmás comprometidos (most engaged) de los menos comprometidos (least\nengaged) y entregarles contenido dinámico personalizado según su perfil."
},
  {
    "id": 98,
    "category": "Subscriber & Data Management",
    "question": "A marketer is asked to create a sendable data extension from various tables including orders, subscribers, and product line items. The resulting data extension will be used as an entry source for a journey. Which tool should help create this table?",
    "choices": [
        "Automation Studio",
        "Audience Studio",
        "Data Designer"
    ],
    "correctAnswerText": "Data Designer",
    "explanation": "Data Designer is the tool that should be used to create a sendable\ndata extension from various tables including orders, subscribers, and product line\nitems. Data Designer allows you to create custom data extensions that can be\nused as an entry source for a journey\nAnswer: (A) In SFMC, All Subscribers is the master list that controls the email"
},
  {
    "id": 99,
    "category": "Subscriber & Data Management",
    "question": "Northern Trail Outfitters(NTO)receives a complaint from a long-time customer who claims that, despite providing an updated email address, they are still receiving emails at an old address. NTO confirms that the customer's new email address is stored in the target data extension. What is preventing the customer from receiving emails at their new address?",
    "choices": [
        "The email address has not been updated in All Subscribers.",
        "The new email address is from an unsupported domain.",
        "The customer has not opted in again with the new address."
    ],
    "correctAnswerText": "The email address has not been updated in All Subscribers.",
    "explanation": "Data Designer is the tool that should be used to create a sendable\ndata extension from various tables including orders, subscribers, and product line\nitems. Data Designer allows you to create custom data extensions that can be\nused as an entry source for a journey\nAnswer: (A) In SFMC, All Subscribers is the master list that controls the email"
},
  {
    "id": 100,
    "category": "Subscriber & Data Management",
    "question": "Northern Trail Outfitters imports a daily feed of active customers into a data extension. A customer is only included in the daily feed if they meet the criteria to remain active. Which import option should be used to ensure the data extension only contains currently active customers?",
    "choices": [
        "Overwrite",
        "Add and Update",
        "Append"
    ],
    "correctAnswerText": "Overwrite",
    "explanation": "address used for delivery — even if the new address exists in a data extension,\nemails are sent to the address stored in All Subscribers for that subscriber key. If\nthat record hasn't been updated, the old address is still what gets used. (B) an\nunsupported domain would cause a bounce or delivery failure entirely, not a\nredirect to a different address — the customer is still receiving emails, just at the\nwrong one. (C) opting in again is not required simply to update an email address —\nthe issue here is a data sync problem between the data extension and All\nSubscribers, not a consent/opt-in gap.\nAnswer: (A) Overwrite clears the entire data extension and replaces it with the\nincoming feed on each import — since the daily file only contains currently active\ncustomers, the DE will always reflect exactly that set with no stale records\nremaining. (B) Add and Update adds new records and updates existing ones but\nnever removes records — customers who no longer meet the active criteria would\nremain in the DE indefinitely, making the data stale. (C) Append only adds new\nrecords without updating or removing existing ones — it's the least suitable option\nhere since it would accumulate inactive customers over time."
},
  {
    "id": 101,
    "category": "Subscriber & Data Management",
    "question": "A marketer has noticed an increase in unsubscribes. They would like to address this concern but, going into a holiday season, want to avoid eliminating planned emails. What should they use to easily focus their marketing efforts on subscribers who are least likely to unsubscribe?",
    "choices": [
        "Path Optimizer",
        "Frequency Split",
        "Scoring Split"
    ],
    "correctAnswerText": "Scoring Split",
    "explanation": "Scoring Split uses Einstein engagement scores to branch contacts by\ntheir likelihood to engage or unsubscribe — the marketer can route only high-\nscore (least likely to unsubscribe) contacts into the holiday sends, keeping\nplanned emails intact while protecting sender reputation. (A) Path Optimizer is a\nJourney Builder activity that tests multiple paths and automatically shifts traffic to\nthe best-performing one, but it's an A/B testing tool — it doesn't specifically filter\nby unsubscribe risk or engagement score. (B) Frequency Split divides contacts\nbased on how many messages they've received, not on their propensity to\nunsubscribe — it limits volume but doesn't intelligently target those least likely to\nopt out."
},
  {
    "id": 102,
    "category": "Subscriber & Data Management",
    "question": "Northern Trail Outfitters(NTO)wants to manager subscriber preferences at the communication theme level. NTO's subscribers are stored in data extensions. Which Marketing Cloud feature should be used to achieve this?",
    "choices": [
        "List Unsubscribes",
        "Publication Lists",
        "Journey Builder Sends"
    ],
    "correctAnswerText": "Publication Lists",
    "explanation": "Publication Lists allow NTO to manage subscriber preferences at the\ncommunication theme level (e.g., promotional, newsletters, product updates) —\nsubscribers can opt in or out of specific communication types, and since NTO\nuses data extensions, Publication Lists are the right tool for granular preference\nmanagement at this level. (A) List Unsubscribes refer to unsubscribe actions tied\nto a specific list, which is a list-based model — it doesn't support the\ncommunication theme/topic-level preference management needed here, especially\nwhen subscribers are stored in data extensions rather than lists. (C) Journey\nBuilder Sends is the mechanism for sending messages within a journey — it's a\ndelivery tool, not a preference management feature, and has no functionality for\nmanaging what communication themes subscribers opt into or out of."
},
  {
    "id": 103,
    "category": "Subscriber & Data Management",
    "question": "Northern Trail Outfitters imports an encrypted file of its subscribers' favorite colors. Which automation activity and configuration setting should be used for import to a data extension?",
    "choices": [
        "Specify character encoding in import file.",
        "Configure Field-Level Encryption in import file.",
        "Manage Files in File Transfer."
    ],
    "correctAnswerText": "Manage Files in File Transfer.",
    "explanation": "When importing an encrypted file, the correct Automation Studio\nactivity to use is File Transfer — it handles decryption (via PGP) of the file before\nit can be processed by the Import File activity. Configuring the File Transfer\nactivity with the appropriate decryption settings is the required step to work with\nencrypted files. (A) specifying character encoding in the import file definition\nhandles text encoding formats (like UTF-8) — it has nothing to do with file-level\nencryption or decryption. (B) Field-Level Encryption is a feature for encrypting\nspecific data fields within a data extension at rest — it's not a configuration for\ndecrypting an incoming encrypted import file."
},
  {
    "id": 104,
    "category": "Subscriber & Data Management",
    "question": "A marketer has created a primary data extension that contains all active subscribers with fields containing key demographics and subscriber attributes. Each week, there are up to 10 teams that send to segments of their subscriber base. What should they use to ensure they have fresh data for these sends?",
    "choices": [
        "A verification step in the send automation",
        "A nightly automation with a filter activity",
        "An approval process for sending"
    ],
    "correctAnswerText": "A nightly automation with a filter activity",
    "explanation": "A nightly automation with a filter activity refreshes the segmented\ndata extensions automatically each night by re-running the filter criteria against\nthe primary DE — this ensures all 10 teams are working with up-to-date subscriber\nsegments before their weekly sends without any manual intervention. (A) a\nverification step in the send automation checks conditions before a send executes\nbut doesn't actually refresh or update the underlying segment data — it validates,\nit doesn't rebuild. (C) an approval process for sending is a governance/workflow\ntool to get sign-off on emails before they go out — it has no effect on whether the\nsubscriber data in the segment is current or stale."
},
  {
    "id": 105,
    "category": "Subscriber & Data Management",
    "question": "Northern Trail Outfitters wants to report on subscribers who did not receive emails that were included in the sending audience. Which tool should provide a list of subscribers who didn't receive the expected emails?",
    "choices": [
        "Sent Data view",
        "Subscribers Not Sent To report",
        "Not Sent Tracking Extract"
    ],
    "correctAnswerText": "Subscribers Not Sent To report",
    "explanation": "The Subscribers Not Sent To report is a built-in SFMC report\nspecifically designed to identify subscribers who were in the sending audience but\ndid not receive the email — it's the most direct, purpose-built tool for this exact\nuse case. (A) the Sent Data View (_Sent) contains records of emails that were\nsuccessfully sent — it tells you who received messages, not who was excluded or\nmissed. (C) a Not Sent Tracking Extract can pull this data programmatically via\nAutomation Studio, but it requires more setup and configuration — it's not the\nquickest or most straightforward reporting tool for this need compared to the\ndedicated report."
},
  {
    "id": 106,
    "category": "Subscriber & Data Management",
    "question": "A marketer typically sends to a filtered data extension that contains their primary audience. They need to target only a portion of this population for an upcoming send. What should they do to further segment their audience?",
    "choices": [
        "Copy the filtered data extension and add additional filter criteria.",
        "Use the Split option to temporarily add additional filter criteria.",
        "Copy the data filter and build a new data extension with additional filter criteria."
    ],
    "correctAnswerText": "Copy the data filter and build a new data extension with additional filter criteria.",
    "explanation": "Copying the data filter and adding additional criteria to build a new\nfiltered data extension is the correct approach — it preserves the original filter and\naudience intact while creating a separate, more refined segment for the one-off\nsend. (A) copying the filtered data extension itself copies the data (the records),\nnot the underlying filter logic — you'd end up with a static snapshot rather than a\nproperly filtered DE with updatable criteria. (B) the Split option in a filtered data\nextension allows you to divide the audience into random portions by percentage,\nnot to add conditional filter criteria — it's for audience splitting, not further\nattribute-based segmentation."
},
  {
    "id": 107,
    "category": "Subscriber & Data Management",
    "question": "A customer uses the Salesforce Contact object as a synchronized data source. They have started to sync custom fields for further segmentation. Which first step should the customer take to ensure the new fields are available to segment on?",
    "choices": [
        "Create a new data extension with the new fields.",
        "Create a data filter that includes the new fields.",
        "Edit the fields in the synchronized data source."
    ],
    "correctAnswerText": "Edit the fields in the synchronized data source.",
    "explanation": "When new custom fields are added to a synchronized data source\n(Salesforce Contact object via Marketing Cloud Connect), the first step is to edit\nthe synchronized data source configuration in Contact Builder to add those new\nfields — only after they're mapped and syncing will they be available for\nsegmentation. (A) creating a new data extension with the new fields doesn't help\n— the fields need to be flowing in from the sync first; a standalone DE won't pull\ndata from the Salesforce Contact object automatically. (B) creating a data filter\nthat includes the new fields can't be done until those fields are actually available in\nthe synchronized DE — you can't filter on fields that aren't yet mapped and\nsyncing."
},
  {
    "id": 108,
    "category": "Subscriber & Data Management",
    "question": "A marketing specialist at Northern Trail Outfitters wants to automate sending the weekly newsletter to subscribers. The audience is located in one data extension, but they also want to send to a partner seed list. Which tool method should the specialist use?",
    "choices": [
        "User Initiated Send",
        "Multi-Step Journey",
        "Automation Studio Email Activity"
    ],
    "correctAnswerText": "Automation Studio Email Activity",
    "explanation": "Automation Studio's Email Activity supports sending to multiple\naudience sources in a single send — you can combine a data extension and a seed\nlist together, and schedule it to run automatically on a weekly cadence, making it\nthe ideal tool for this automated, multi-source send. (A) User Initiated Send is a\nmanual send method triggered by a marketer clicking send — it's not automated,\nso it doesn't meet the \"automate the weekly newsletter\" requirement. (B) a Multi-\nStep Journey is designed for triggered, behavior-driven subscriber experiences\nover time — it's not the right fit for a straightforward scheduled batch send to a\nstatic audience plus a seed list."
},
  {
    "id": 109,
    "category": "Subscriber & Data Management",
    "question": "Northern Trail Outfitters (NTO) is troubleshooting why a triggered send isn't being delivered to the customer. When querying the subscribers data view, NTO notices this subscriber key exists twice, and one of them has a status of 'Held'. What is the source of the duplicate subscriber key?",
    "choices": [
        "Auto Suppression List",
        "Global Unsubscribe List",
        "Triggered Send Managed Lists"
    ],
    "correctAnswerText": "Triggered Send Managed Lists",
    "explanation": "Triggered Send Managed Lists automatically create and manage\nsubscriber records associated with a triggered send definition — when a triggered\nsend is configured, it can generate a duplicate subscriber key entry with a 'Held'\nstatus in the data view, which is the source of the duplicate seen here. (A) the\nAuto Suppression List suppresses addresses from receiving emails but doesn't\ncreate duplicate subscriber key records in the subscribers data view with a 'Held'\nstatus. (B) the Global Unsubscribe List sets a subscriber's status to\n'Unsubscribed' globally — it doesn't generate a duplicate subscriber key record\nwith a 'Held' status alongside the original."
},
  {
    "id": 110,
    "category": "Subscriber & Data Management",
    "question": "Northern Trail Outfitters needs to send a transactional email to all customers who purchased an item that was recently recalled. The email must be sent to each applicable customer even if they have unsubscribed. Which component should be configured to provide this functionality?",
    "choices": [
        "Send Classification",
        "Sender Profile",
        "Delivery Profile"
    ],
    "correctAnswerText": "Send Classification",
    "explanation": "Send Classification is the component that determines the email's\nclassification as Transactional — this is what allows the email to bypass\nunsubscribe rules and be delivered even to opted-out subscribers, which is legally\npermissible for critical transactional messages like product recalls. (B) a Sender\nProfile defines the From name and From address for a send — it controls sender\nidentity but has no bearing on whether unsubscribed contacts can receive the\nemail. (C) a Delivery Profile controls the sending IP, header/footer, and physical\nmailing address settings — it manages deliverability configuration but doesn't\ncontrol whether a send overrides unsubscribe status."
},
  {
    "id": 111,
    "category": "Subscriber & Data Management",
    "question": "Northern Trail Outfitters wants to ensure that the Email Address field value is not duplicated in a data extension. What should a marketer do to ensure the Email Address field values are unique?",
    "choices": [
        "Mark the data extension as Sendable.",
        "Use Email Address as Subscriber Key.",
        "Mark the field as the Primary Key."
    ],
    "correctAnswerText": "Mark the field as the Primary Key.",
    "explanation": "Marking the Email Address field as the Primary Key enforces\nuniqueness at the data extension level — SFMC will reject any record that attempts\nto insert a duplicate value for that field, guaranteeing all email addresses in the DE\nare unique. (A) marking the data extension as Sendable designates it for use in\nemail sends by linking a subscriber key field — it doesn't enforce uniqueness on\nany field, including Email Address. (B) using Email Address as the Subscriber Key\nmaps it to All Subscribers for send purposes, but this is a sendable DE\nconfiguration setting — it doesn't technically enforce a unique constraint on the\nfield within the data extension itself the way a Primary Key does."
},
  {
    "id": 112,
    "category": "Insights & Analytics",
    "question": "Northern Trail Outfitters (NTO) has rolled out changes to its CTA button color. Where should NTO be able to see if there has been a lift in overall likelihood to click?",
    "choices": [
        "Einstein Engagement Scoring",
        "Einstein Messaging Insights",
        "Einstein Engagement Frequency"
    ],
    "correctAnswerText": "Einstein Engagement Scoring",
    "explanation": "Einstein Engagement Scoring provides insights into how changes, such as the\ncolor of a CTA button, impact the likelihood of subscribers engaging with emails. It\nuses predictive analytics to score and segment subscribers based on their\nengagement behaviors, allowing marketers to see the lift in engagement metrics\nlike click-through rates.\nAnswer: (B) Einstein Messaging Insights specifically provides notification badges\nthat alert marketers to abnormal subscriber behavior and performance anomalies\n— such as unusual drops in open or click rates — directly within the Email Studio"
},
  {
    "id": 113,
    "category": "Insights & Analytics",
    "question": "Northern Trail Outfitters (NTO) wants to be notified of any abnormal subscriber behavior with its 'Weekly Deals' email. Which feature provides notification badges to alert NTO of any performance issues?",
    "choices": [
        "Einstein Copy Insights",
        "Einstein Messaging Insights",
        "Einstein Engagement Scoring"
    ],
    "correctAnswerText": "Einstein Messaging Insights",
    "explanation": "Einstein Engagement Scoring provides insights into how changes, such as the\ncolor of a CTA button, impact the likelihood of subscribers engaging with emails. It\nuses predictive analytics to score and segment subscribers based on their\nengagement behaviors, allowing marketers to see the lift in engagement metrics\nlike click-through rates.\nAnswer: (B) Einstein Messaging Insights specifically provides notification badges\nthat alert marketers to abnormal subscriber behavior and performance anomalies\n— such as unusual drops in open or click rates — directly within the Email Studio"
},
  {
    "id": 114,
    "category": "Insights & Analytics",
    "question": "The CMO at Northern Trail Outfitters (NTO) has tasked the marketer with tracking the performance of NTO's welcome and post-purchase journeys. Which action should the marketer take to evaluate journey performance?",
    "choices": [
        "Define a goal for each journey.",
        "Export the journey email analytics.",
        "Review opens and clicks activity summaries."
    ],
    "correctAnswerText": "Define a goal for each journey.",
    "explanation": "send results, making it exactly the feature described. (A) Einstein Copy Insights\nanalyzes the language and copy in subject lines to provide recommendations for\nimproving engagement — it's a content optimization tool, not a performance\nanomaly alert system. (C) Einstein Engagement Scoring assigns individual\nsubscribers a score predicting their likelihood to engage or unsubscribe — it's a\nper-contact predictive tool, not a notification/badge system for flagging send-level\nperformance issues.\nAnswer: (A) Defining a Goal for each journey enables Journey Builder to track how\nmany contacts achieve the desired outcome (e.g., making a purchase, completing\na registration) — this is the purpose-built mechanism for measuring overall journey\nperformance against a business objective. (B) exporting journey email analytics\nprovides raw send/open/click data for individual messages within the journey, but\nit doesn't give a holistic view of whether the journey is achieving its intended\nbusiness goal — it's granular message-level data, not journey-level performance\nevaluation. (C) reviewing opens and clicks activity summaries shows engagement\nmetrics at the email activity level, which is useful for individual message\nperformance but doesn't measure whether contacts are progressing through and\ncompleting the journey's intended purpose."
},
  {
    "id": 115,
    "category": "Insights & Analytics",
    "question": "Northern Trail Outfitters wants information on the email performance of an abandoned cart journey. Which Journey Builder resource provides data on all versions of a specific journey's cross-channel performance data?",
    "choices": [
        "Journey Analytics Dashboard",
        "Email Analytics Tile",
        "Journey History"
    ],
    "correctAnswerText": "Journey Analytics Dashboard",
    "explanation": "The Journey Analytics Dashboard provides a comprehensive view of\nperformance data across all versions of a journey and across all channels (email,\nSMS, push, etc.) — it's the single resource designed to show cross-channel\nperformance holistically for a specific journey. (B) the Email Analytics Tile shows\nemail-specific metrics within a journey, but it's scoped to email only and doesn't\nprovide the cross-channel view the question requires. (C) Journey History shows a\nlog of contacts who have entered and moved through the journey — it's an audit/\ncontact tracking tool, not a performance analytics resource for cross-channel\nsend metrics across all versions."
},
  {
    "id": 116,
    "category": "Insights & Analytics",
    "question": "A marketer has started using Datorama Reports to enhance their email performance and engagement monitoring. Which feature should improve Datorama Dashboard usability?",
    "choices": [
        "Campaigns",
        "Tags",
        "Sender Profile"
    ],
    "correctAnswerText": "Campaigns",
    "explanation": "En los informes de Datorama (Intelligence Reports for Marketing Cloud), asociar\ntus correos electrónicos a Campañas estructuradas dentro de Marketing Cloud es\nla mejor práctica para optimizar la usabilidad del tablero.\nAnswer: (A) Tracking Data Extract in Automation Studio is specifically designed to\nexport historical engagement data (opens, clicks, bounces, unsubscribes, etc.)\nfrom SFMC — it's the right tool to pull last year's holiday engagement data for\ncomparison analysis. (B) Audit Trail extract captures a log of user actions and\nsystem activity within the SFMC account (who did what and when) — it's an"
},
  {
    "id": 117,
    "category": "Insights & Analytics",
    "question": "Northern Trail Outfitters' marketing department wants to review last year's holiday engagement to this year's engagement. What should they use to access the historical engagement data?",
    "choices": [
        "Tracking Data extract",
        "Audit Trail extract",
        "SQL activity using data views"
    ],
    "correctAnswerText": "Tracking Data extract",
    "explanation": "En los informes de Datorama (Intelligence Reports for Marketing Cloud), asociar\ntus correos electrónicos a Campañas estructuradas dentro de Marketing Cloud es\nla mejor práctica para optimizar la usabilidad del tablero.\nAnswer: (A) Tracking Data Extract in Automation Studio is specifically designed to\nexport historical engagement data (opens, clicks, bounces, unsubscribes, etc.)\nfrom SFMC — it's the right tool to pull last year's holiday engagement data for\ncomparison analysis. (B) Audit Trail extract captures a log of user actions and\nsystem activity within the SFMC account (who did what and when) — it's an"
},
  {
    "id": 118,
    "category": "Insights & Analytics",
    "question": "Northern Trail Outfitters (NTO) needs a quick listing of all email sends from the past calendar year across all business units. It should include basic metrics for each send. Which out-of-the-box report provides what NTO needs?",
    "choices": [
        "Account Send Summary",
        "Email Sends by User",
        "Email Performance Over Time"
    ],
    "correctAnswerText": "Account Send Summary",
    "explanation": "administrative/compliance tool, not an engagement metrics tool. (C) SQL activity\nusing data views can technically query engagement data, but data views only\nretain data for a rolling 6-month window — making them unsuitable for accessing\nlast year's holiday engagement data, which would fall outside that retention\nperiod.\nAnswer: (A) Account Send Summary is an out-of-the-box report that lists all email\nsends across business units with basic metrics (sent, opens, clicks, bounces) for\neach send — it's exactly what NTO needs for a cross-BU overview of the past\ncalendar year's sends. (B) Email Sends by User breaks down send activity by the\nindividual user who initiated each send — it's focused on user-level attribution, not\na comprehensive cross-BU send listing with performance metrics. (C) Email\nPerformance Over Time aggregates engagement metrics across a time period into\ntrend data — it shows performance trends rather than a discrete listing of\nindividual sends with per-send metrics."
},
  {
    "id": 119,
    "category": "Insights & Analytics",
    "question": "The marketing team wants to target subscribers with a \"thank you\" offer for all subscribers who have opened an email in the past year. Which tool should they use to identify the subscribers to send to?",
    "choices": [
        "_Open data view",
        "Tracking Data Extract",
        "Total Opens measure"
    ],
    "correctAnswerText": "Tracking Data Extract",
    "explanation": "Tracking Data Extract is the right tool here because the requirement\nspans the past year — the _Open data view only retains data for a rolling 6\nmonths, so it can't reliably capture all openers over a full year. A Tracking Data\nExtract pulls the complete historical open data needed to identify every subscriber\nwho opened in that timeframe. (A) the _Open data view would be ideal for a\nshorter window, but its 6-month data retention limit means subscribers who\nopened 7–12 months ago would be missing — making it insufficient for a full year\nof open history. (C) Total Opens measure is an aggregate metric (a count) — it tells\nyou how many total opens occurred, not which subscribers opened, so it can't be\nused to build a targetable audience."
},
  {
    "id": 120,
    "category": "Insights & Analytics",
    "question": "Northern Trail Outfitters' marketing manager wants to schedule a report to be sent weekly to an AzureBlob regarding the performance of a holiday campaign. Which tool should they use?",
    "choices": [
        "Datorama Pivot Table",
        "Campaign Email Tracking Report",
        "Tracking Data Extract & file transfer"
    ],
    "correctAnswerText": "Tracking Data Extract & file transfer",
    "explanation": "Tracking Data Extract combined with a File Transfer activity in\nAutomation Studio is the correct approach — it extracts the campaign\nperformance data on a scheduled basis and then transfers the output file to an\nexternal location like Azure Blob Storage, fully automating the weekly delivery. (A)\nDatorama Pivot Table is a data visualization and analysis feature within Datorama/\nMarketing Cloud Intelligence — it doesn't have native functionality to schedule and\npush exported files to an external storage location like Azure Blob. (B) Campaign\nEmail Tracking Report is a standard SFMC report for viewing campaign email\nmetrics within the platform — it can't be scheduled to automatically export and\ndeliver data to an external Azure Blob destination."
},
  {
    "id": 121,
    "category": "Insights & Analytics",
    "question": "Within Datorama Reports for Marketing Cloud, a marketer would like to create a new set of reports for the organization that are custom and not available within the preconfigured reports. What should be created to achieve this?",
    "choices": [
        "A Collection",
        "A Dimension",
        "A Dashboard"
    ],
    "correctAnswerText": "A Collection",
    "explanation": "A Collection is what you create in Datorama Reports for Marketing\nCloud to build a custom set of reports beyond the preconfigured options — it's a\nuser-defined grouping of widgets and visualizations tailored to the organization's\nspecific reporting needs. (C) a Dashboard refers to the preconfigured reporting\nviews already available in Datorama Reports — it's not the mechanism for building\nnew, custom report sets from scratch. (B) a Dimension is a data attribute used to\ncategorize and slice metrics — it's a data modeling building block, not a reporting\ncreation feature."
},
  {
    "id": 122,
    "category": "Insights & Analytics",
    "question": "A marketing team wants to schedule automatic delivery of pivot table data to an Amazon Web Services(AWS)S3 bucket every Monday at 6:00 a.m. Which method meets their needs?",
    "choices": [
        "Report Definition Activity in Automation Studio",
        "Report Scheduling in Datorama Reports",
        "File Transfer Activity in Automation Studio"
    ],
    "correctAnswerText": "Report Scheduling in Datorama Reports",
    "explanation": "Report Scheduling in Datorama Reports allows you to schedule\nautomatic delivery of pivot table data directly to external destinations including\nAWS S3 — it's the native Datorama feature built specifically for this use case, with\nfull scheduling control (day, time, destination). (A) Report Definition Activity in\nAutomation Studio is used to run and export standard SFMC reports on a\nschedule, but it doesn't handle Datorama pivot table data or deliver to S3. (C) File\nTransfer Activity in Automation Studio moves files between SFMC and external\nstorage locations, but it operates on files already extracted within SFMC — it's not\nthe tool for scheduling and delivering Datorama pivot table output to AWS S3."
},
  {
    "id": 123,
    "category": "Insights & Analytics",
    "question": "A marketing manager wants to see how the cross-channel customer population has changed over the last 6 months. Which report should be run to provide this information?",
    "choices": [
        "Audience Engagement Over Time",
        "Contacts Count",
        "Contacts Analytics"
    ],
    "correctAnswerText": "Contacts Analytics",
    "explanation": "Contacts Analytics report shows how the cross-channel contact\npopulation has changed over time — it tracks contact growth, deletions, and net\nchanges across channels, making it the right report for understanding how the\ncustomer population has evolved over the last 6 months. (A) Audience\nEngagement Over Time tracks engagement metrics (opens, clicks, etc.) over a\nperiod — it measures how subscribers are interacting with messages, not how the\nsize or composition of the contact population has changed. (B) Contacts Count\nprovides a current snapshot of the total number of contacts — it's a point-in-time\nfigure, not a historical trend view showing how the population has changed over a\n6-month window."
},
  {
    "id": 124,
    "category": "Insights & Analytics",
    "question": "Northern Trail Outfitters (NTO) has noticed a decrease in open rate across all email campaigns. NTO is concerned its sender reputation may have been negatively impacted by a recent import of subscribers. Which metric should be analyzed as a possible indicator of bad sender reputation?",
    "choices": [
        "Click rate",
        "Send volume",
        "Block bounces"
    ],
    "correctAnswerText": "Block bounces",
    "explanation": "Block bounces occur when a receiving mail server actively rejects\nemails due to sender reputation issues — a spike in block bounces after importing\nnew subscribers is a direct signal that ISPs may have flagged NTO's sending\ndomain or IP, making it the most relevant indicator of damaged sender reputation.\n(A) click rate measures how many recipients clicked a link in an email — it reflects\ncontent engagement and audience quality, but a low click rate alone is not a direct\nindicator of sender reputation problems with ISPs. (B) send volume is simply the\nnumber of emails sent — while a sudden increase in volume can contribute to\nreputation issues, the metric itself doesn't indicate whether sender reputation has\nbeen negatively impacted."
},
  {
    "id": 125,
    "category": "Insights & Analytics",
    "question": "Northern Trail Outfitters (NTO) sends hundreds of different email campaigns monthly. What should be set up to help organize NTO's email tracking results?",
    "choices": [
        "Remove old tracking results on a regular basis to declutter the results list.",
        "Give emails unique names so they are easier to find in the tracking sends tab.",
        "Create folders in My Tracking and select where to send results when sending an email."
    ],
    "correctAnswerText": "Create folders in My Tracking and select where to send results when sending an email.",
    "explanation": "Creating folders in My Tracking and assigning sends to specific\nfolders at send time is the purpose-built organizational feature in SFMC for\nmanaging large volumes of tracking results — it lets NTO group sends by\ncampaign, team, or category for easy navigation and reporting. (A) removing old\ntracking results is destructive and eliminates historical performance data that may\nstill be needed for analysis or reporting — it's not a sustainable or recommended\norganizational strategy. (B) giving emails unique names helps with searchability\nbut doesn't provide any structural organization — with hundreds of campaigns\nmonthly, a flat list of uniquely named sends is still difficult to navigate without a\nfolder hierarchy."
},
  {
    "id": 126,
    "category": "Insights & Analytics",
    "question": "The marketer for Northern Trail Outfitters wants to review the tone of subject lines and the effect on engagement for recent sends. Which tool should supply insights into the tone of subject lines?",
    "choices": [
        "Einstein Recommendations",
        "Einstein Copy Insights",
        "Einstein Messaging Insights"
    ],
    "correctAnswerText": "Einstein Copy Insights",
    "explanation": "Einstein Copy Insights is specifically designed to analyze the language\nand tone of subject lines across recent sends and correlate them with engagement\noutcomes — it's the exact tool built to surface insights about how subject line tone\n(urgent, friendly, informative, etc.) impacts open rates. (A) Einstein\nRecommendations is a personalization feature that suggests products or content\nto individual subscribers based on their behavior — it has nothing to do with\nanalyzing subject line language or tone. (C) Einstein Messaging Insights monitors\nsend performance for anomalies and unusual engagement patterns — it flags\nwhen something is performing abnormally, but it doesn't analyze the linguistic\ntone of subject lines or connect copy style to engagement trends."
},
  {
    "id": 127,
    "category": "Insights & Analytics",
    "question": "Leadership at Northern Trail Outfitters wants to see a dashboard showing the success rate of customers that have been through a Welcome Series Journey in the last 7 days. Where should they find this dashboard?",
    "choices": [
        "Reports-Journey Engagement",
        "Datorama Reports-Journey Performance",
        "Journey Builder-Journey History"
    ],
    "correctAnswerText": "Datorama Reports-Journey Performance",
    "explanation": "Datorama Reports - Journey Performance provides a dashboard view\nof journey success metrics including goal completion rates, contact progression,\nand engagement across journey versions — it's the right place to see how\ncustomers have fared through the Welcome Series in the last 7 days. (A) Reports -\nJourney Engagement is a standard SFMC report that shows email-level\nengagement metrics (opens, clicks) for journey sends, but it doesn't provide a\nholistic success rate dashboard for the overall journey experience. (C) Journey\nBuilder - Journey History is a contact-level log showing which contacts entered\nand moved through the journey — it's useful for auditing individual contact paths,\nbut it's not a dashboard showing aggregate success rates for leadership."
},
  {
    "id": 128,
    "category": "Insights & Analytics",
    "question": "Northern Trail Outfitters (NTO) is interested in exploring its large volume of send data. NTO wants to dynamically filter, sort, and group the data in one view but is not comfortable writing SQL queries. Which tool should NTO use?",
    "choices": [
        "Filter Activity in Automation Studio",
        "Email Performance Over Time Report",
        "Pivot table in Datorama Reports"
    ],
    "correctAnswerText": "Pivot table in Datorama Reports",
    "explanation": "Pivot Table in Datorama Reports provides a no-code, interactive\ninterface to dynamically filter, sort, and group large volumes of send data in a\nsingle view — it's purpose-built for exactly this use case and requires no SQL\nknowledge. (A) Filter Activity in Automation Studio uses a point-and-click filter to\nsegment data extension records, but it's designed for creating audience\nsegments, not for exploring and analyzing send performance data dynamically. (B)\nEmail Performance Over Time Report is a static, preconfigured report that shows\nengagement trends across a time range — it doesn't allow dynamic filtering,\nsorting, and grouping of data in an interactive way."
},
  {
    "id": 129,
    "category": "Insights & Analytics",
    "question": "Northern Trail Outfitters (NTO) is using Datorama Reports for Marketing Cloud to report on email and journey performance. Which preconfigured dashboard should NTO review to get an idea of which journeys are performing the best?",
    "choices": [
        "Email and Journey Overview Dashboard",
        "Email Performance Dashboard",
        "Journey Performance by Email Dashboard"
    ],
    "correctAnswerText": "Journey Performance by Email Dashboard",
    "explanation": "Journey Performance by Email Dashboard is the preconfigured\nDatorama dashboard specifically focused on journey-level performance metrics\nbroken down by email — it's the right view for comparing how different journeys\nare performing against each other. (A) Email and Journey Overview Dashboard\nprovides a high-level combined summary of both email and journey activity, but\nit's a broad overview rather than a focused comparison of journey performance\nrankings. (B) Email Performance Dashboard focuses on email send metrics (opens,\nclicks, deliverability) at the email level — it doesn't surface journey-level\nperformance comparisons needed to determine which journeys are performing\nbest."
}
];

async function fetchAndParseQuestions() {
  const loadingFill = document.getElementById("loading-fill");
  if (loadingFill) loadingFill.style.width = "100%";
  return [...QUESTIONS];
}

// ============================================================
// SECTION 4: DUAL-SHUFFLE ENGINE (Fisher-Yates)
// ============================================================

/**
 * Fisher-Yates (Knuth) shuffle algorithm for arrays.
 * Mutates the array in place and returns it.
 */
function fisherYatesShuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Creates a shuffled copy of the question array (global shuffle).
 * Does NOT mutate the original array.
 */
function shuffleQuestions(questions) {
  return fisherYatesShuffle([...questions]);
}

/**
 * Shuffles the options for a single question and maps the correct answer.
 *
 * CRITICAL LOGIC: Before shuffling, we capture the text content of the
 * correct answer. After shuffling, we assign new positional letters (A, B, C)
 * and determine which new letter corresponds to the original correct answer.
 *
 * Returns: { shuffledOptions: [{letter, text, originalLetter}], correctLetter: "X" }
 */
function shuffleOptions(question) {
  // Create a copy of the choices array
  const choicesCopy = [...question.choices];
  fisherYatesShuffle(choicesCopy);
  return choicesCopy;
}

/**
 * Generates and caches shuffled option mappings for all questions in an array.
 * Called when a quiz tab initializes or is reshuffled.
 */
function generateShuffleMaps(questions) {
  questions.forEach(q => {
    state.shuffleMap[q.id] = shuffleOptions(q);
  });
}

// ============================================================
// SECTION 5: TAB SYSTEM
// ============================================================

function renderTabButtons() {
  const nav = $(".tab-nav");
  if (!nav) return;
  nav.innerHTML = "";

  const tabs = [
    { label: "Dashboard", icon: "📊" },
    { label: "Email Marketing", weight: "24%" },
    { label: "Content Creation", weight: "22%" },
    { label: "Marketing Automation", weight: "28%" },
    { label: "Subscriber & Data", weight: "16%" },
    { label: "Insights & Analytics", weight: "10%" },
    { label: "Full Exam (129)", icon: "🎯" }
  ];

  tabs.forEach((tab, i) => {
    const btn = document.createElement("button");
    btn.className = "tab-btn" + (i === 0 ? " active" : "");
    btn.dataset.tab = i;

    let countBadge = "";
    if (i > 0 && i < 6) {
      const count = state.questions.filter(q => q.category === TAB_CATEGORIES[i]).length;
      countBadge = `<span class="tab-badge">${count}</span>`;
    } else if (i === 6) {
      countBadge = `<span class="tab-badge">${state.questions.length}</span>`;
    }

    btn.innerHTML = `${tab.icon || ""}${tab.label}${tab.weight ? ` (${tab.weight})` : ""}${countBadge}`;
    nav.appendChild(btn);
  });
}

function setActiveTab(index) {
  state.activeTab = index;
  $$(".tab-btn").forEach((btn, i) => btn.classList.toggle("active", i === index));
  $$(".tab-pane").forEach((pane, i) => pane.classList.toggle("active", i === index));
}

// ============================================================
// SECTION 6: DASHBOARD RENDERING
// ============================================================

function renderDashboard() {
  const pane = document.getElementById("tab-0");
  if (!pane) return;

  const topicList = [
    { name: CATEGORIES.EMAIL,      weight: "24%", desc: "IP warming, sender reputation, bounce management, deliverability best practices, authentication (SPF/DKIM/SAP), dedicated IPs, and email send classification.", color: "var(--cat-agents)" },
    { name: CATEGORIES.CONTENT,    weight: "22%", desc: "Content Builder, Email Studio templates, dynamic content, AMPscript personalization, interactive email forms, accessibility (WCAG), and pre-deployment tools.", color: "var(--cat-prompt)" },
    { name: CATEGORIES.AUTOMATION, weight: "28%", desc: "Journey Builder (entry sources, splits, goals, exit criteria, versioning), Automation Studio (activities, scheduling, file drop triggers), and multi-channel orchestration.", color: "var(--cat-data)" },
    { name: CATEGORIES.DATA,       weight: "16%", desc: "Data extensions, sendable DEs, import/export, Publication Lists, Subscription Center, Contact Builder, suppression lists, data retention, and BU data sharing.", color: "var(--cat-testing)" },
    { name: CATEGORIES.ANALYTICS,  weight: "10%", desc: "Tracking reports, Intelligence Reports (Datorama), Einstein tools (Messaging Insights, Copy Insights, Engagement Scoring), Journey Analytics, and data views.", color: "var(--cat-gov)" }
  ];

  const totalQuestions = state.questions.length;

  pane.innerHTML = `
    <div class="dashboard-grid">
      <div class="dash-card">
        <h2>📋 Exam Overview</h2>
        <p>Salesforce Certified Marketing Cloud Engagement Specialist</p>
        <div class="stat-row">
          <div class="stat-box">
            <div class="stat-value">60</div>
            <div class="stat-label">Questions</div>
          </div>
          <div class="stat-box">
            <div class="stat-value">105</div>
            <div class="stat-label">Minutes</div>
          </div>
          <div class="stat-box">
            <div class="stat-value">68%</div>
            <div class="stat-label">Passing Score</div>
          </div>
        </div>
        <p style="font-size:.8rem;color:var(--text-muted);margin-top:12px">
          Multiple-choice format (3 options per question). This simulator contains ${totalQuestions} practice questions across all sections.
        </p>
      </div>

      <div class="dash-card">
        <h2>🎯 Your Progress</h2>
        <p>Track your study progress across all sections.</p>
        <div class="stat-row">
          <div class="stat-box">
            <div class="stat-value" id="dash-answered">0</div>
            <div class="stat-label">Answered</div>
          </div>
          <div class="stat-box">
            <div class="stat-value" id="dash-correct">0</div>
            <div class="stat-label">Correct</div>
          </div>
          <div class="stat-box">
            <div class="stat-value" id="dash-score">—</div>
            <div class="stat-label">Score</div>
          </div>
        </div>
      </div>

      <div class="dash-card full-width">
        <h3>📚 Exam Topic Breakdown</h3>
        <p>The Marketing Cloud Engagement Specialist exam covers 5 domains. This simulator has 129 practice questions.</p>
        <ul class="topic-checklist">
          ${topicList.map((t, idx) => {
    const count = state.questions.filter(q => q.category === t.name).length;
    return `
            <li>
              <input type="checkbox" id="chk-${idx}">
              <div>
                <strong>${t.name}</strong><br>
                <span style="font-size:.78rem;color:var(--text-muted)">${t.desc}</span>
              </div>
              <span class="topic-weight" style="color:${t.color}">${t.weight} · ${count} Qs</span>
            </li>`;
  }).join("")}
        </ul>
      </div>

      <div class="dash-card full-width">
        <h3>📈 Category Progress</h3>
        <p>Your completion rate per study domain.</p>
        <div class="cat-progress-grid">
          ${topicList.map((t, idx) => {
    const catId = `cat-progress-${idx}`;
    return `
            <div class="cat-progress-item" style="border-left-color:${t.color}">
              <div class="cp-label">${t.name}</div>
              <div class="cp-bar"><div class="cp-fill" id="${catId}-fill" style="background:${t.color}"></div></div>
              <div class="cp-text" id="${catId}-text">0% complete</div>
            </div>`;
  }).join("")}
        </div>
      </div>
    </div>
  `;
}

// ============================================================
// SECTION 7: QUIZ RENDERING
// ============================================================

function renderAllQuizTabs() {
  // Tabs 1-6: Category-filtered, original sequential order
  for (let i = 1; i <= 5; i++) {
    const cat = TAB_CATEGORIES[i];
    const questions = state.questions.filter(q => q.category === cat);
    renderQuizTab(i, cat, questions);
  }
  // Tab 6: Full simulator (all questions in original order)
  renderQuizTab(6, "Full 129-Question Simulator", [...state.questions]);
}

function getTabQuestions(tabIndex) {
  if (tabIndex === 6) return [...state.questions];
  const cat = TAB_CATEGORIES[tabIndex];
  return state.questions.filter(q => q.category === cat);
}

/**
 * Re-shuffle a specific tab: reorder questions AND reshuffle all options.
 */
window.shuffleTab = function (tabIndex) {
  const title = tabIndex === 6
    ? "Full 129-Question Simulator"
    : TAB_CATEGORIES[tabIndex];
  const questions = getTabQuestions(tabIndex);
  const shuffled = shuffleQuestions(questions);
  generateShuffleMaps(shuffled);
  renderQuizTab(tabIndex, title, shuffled);
  restoreSubmittedState(tabIndex);
  window.scrollTo({ top: 0, behavior: "smooth" });
};

function restoreSubmittedState(tabIndex) {
  const pane = document.getElementById(`tab-${tabIndex}`);
  if (!pane) return;

  const cards = pane.querySelectorAll(".question-card");
  cards.forEach(card => {
    const qid = parseInt(card.dataset.qid);
    if (!state.submitted[qid]) return;

    const q = state.questions.find(x => x.id === qid);
    if (!q) return;

    const selectedText = state.answers[qid];
    const isCorrect = (selectedText !== undefined && selectedText !== null)
      ? selectedText.trim() === q.correctAnswerText.trim()
      : false;

    if (state.mode === "study") {
      card.classList.add(isCorrect ? "answered-correct" : "answered-incorrect");
      const options = card.querySelectorAll(".option-item");
      options.forEach(opt => {
        const optText = opt.querySelector(".option-text").textContent.trim();
        opt.classList.add("disabled");
        if (optText === q.correctAnswerText.trim()) {
          opt.classList.add("correct");
        } else if (selectedText && optText === selectedText.trim()) {
          opt.classList.add("incorrect");
        }
      });
      const btn = card.querySelector(`.btn-submit`);
      if (btn) btn.style.display = "none";
      const explanation = card.querySelector(`.explanation-panel`);
      if (explanation) explanation.classList.add("visible");
    } else {
      const btn = card.querySelector(`.btn-submit`);
      if (btn) {
        btn.textContent = "✓ Saved";
        btn.disabled = true;
        btn.classList.remove("primary");
        btn.classList.add("secondary");
      }
      const options = card.querySelectorAll(".option-item");
      options.forEach(opt => {
        const optText = opt.querySelector(".option-text").textContent.trim();
        opt.classList.toggle("selected", selectedText && optText === selectedText.trim());
      });
    }
  });
}

function renderQuizTab(tabIndex, title, questions) {
  const pane = document.getElementById(`tab-${tabIndex}`);
  if (!pane) return;

  const shuffleBtn = `<button class="btn-shuffle" onclick="shuffleTab(${tabIndex})" title="Shuffle question order and option positions">🔀 Shuffle</button>`;

  pane.innerHTML = `
    <div class="section-header">
      <h2>${title}</h2>
      <div class="section-header-actions">
        ${shuffleBtn}
        <span class="section-progress" id="progress-${tabIndex}">0 / ${questions.length} Answered</span>
      </div>
    </div>
    <div class="quiz-container" id="quiz-${tabIndex}">
      ${questions.map(q => renderQuestionCard(q)).join("")}
    </div>
  `;
}

/**
 * Renders a single question card.
 * Uses the shuffled option order from state.shuffleMap if available,
 * otherwise falls back to the original sequential order from q.choices.
 */
function renderQuestionCard(q) {
  let displayOptions = state.shuffleMap[q.id];
  if (!displayOptions) {
    displayOptions = [...q.choices];
  }

  // Letters are PURELY cosmetic — never used in scoring logic
  const LETTERS = ['A', 'B', 'C', 'D'];

  const isExamMode = state.mode === "exam";
  const actionsStyle = isExamMode ? "display: none;" : "";

  return `
    <div class="question-card" id="qcard-${q.id}" data-qid="${q.id}">
      <div class="question-header">
        <div class="question-number">Q${q.id}</div>
        <div class="question-body">
          <div class="question-text">
            ${q.question}
          </div>
        </div>
      </div>
      <div class="options-list" id="options-${q.id}">
        ${displayOptions.map((optText, idx) => {
    const letter = LETTERS[idx] || String.fromCharCode(65 + idx);
    return `
            <div class="option-item" data-qid="${q.id}" data-idx="${idx}" onclick="selectOption(${q.id},${idx})">
              <div class="option-radio"></div>
              <div class="option-letter">${letter}</div>
              <div class="option-text">${optText}</div>
            </div>
          `;
  }).join("")}
      </div>
      <div class="question-actions" id="actions-${q.id}" style="${actionsStyle}">
        <button class="btn-submit primary" id="submit-${q.id}" disabled onclick="submitAnswer(${q.id})">Submit Answer</button>
      </div>
      <div class="explanation-panel" id="explanation-${q.id}">
        <h4>💡 Explanation</h4>
        <p>${q.explanation}</p>
      </div>
    </div>
  `;
}

// ============================================================
// SECTION 8: ANSWER SELECTION & SUBMISSION
// ============================================================

window.selectOption = function (qid, selectedIdx) {
  if (state.submitted[qid] && state.mode === "study") return;

  const activeTabPane = $(`#tab-${state.activeTab}`);
  if (!activeTabPane) return;

  const optionEl = activeTabPane.querySelector(`#options-${qid} .option-item[data-idx="${selectedIdx}"]`);
  if (!optionEl) return;
  const selectedText = optionEl.querySelector(".option-text").textContent.trim();

  // Store the string of the selected option
  state.answers[qid] = selectedText;

  // Update UI in active tab — highlight only the selected option
  const options = activeTabPane.querySelectorAll(`#options-${qid} .option-item`);
  options.forEach(opt => {
    const optIdx = parseInt(opt.dataset.idx);
    opt.classList.toggle("selected", optIdx === selectedIdx);
  });

  if (state.mode === "exam") {
    // Automatically mark as submitted/saved in exam mode so user doesn't have to click "Submit Answer"
    state.submitted[qid] = true;
    updateScoreMatrix();
    updateTabProgress();
  } else {
    // Enable submit button in Study mode in the active tab pane
    const btn = activeTabPane.querySelector(`#submit-${qid}`);
    if (btn) btn.disabled = false;
  }
};

window.submitAnswer = function (qid) {
  if (state.submitted[qid]) return;

  const q = state.questions.find(x => x.id === qid);
  if (!q) return;

  const selectedText = state.answers[qid];
  if (selectedText === undefined || selectedText === null) return;

  const isCorrect = selectedText.trim() === q.correctAnswerText.trim();
  const activeTabPane = $(`#tab-${state.activeTab}`);

  if (state.mode === "exam") {
    // In exam mode, mark as submitted silently — no feedback
    state.submitted[qid] = true;
    const btn = activeTabPane ? activeTabPane.querySelector(`#submit-${qid}`) : null;
    if (btn) {
      btn.textContent = "✓ Saved";
      btn.disabled = true;
      btn.classList.remove("primary");
      btn.classList.add("secondary");
    }
    updateScoreMatrix();
    updateTabProgress();
    return;
  }

  // Study mode: show immediate feedback
  state.submitted[qid] = true;

  const card = activeTabPane ? activeTabPane.querySelector(`#qcard-${qid}`) : null;
  if (card) card.classList.add(isCorrect ? "answered-correct" : "answered-incorrect");

  // Style options by text content
  const options = activeTabPane ? activeTabPane.querySelectorAll(`#options-${qid} .option-item`) : [];
  options.forEach(opt => {
    const optText = opt.querySelector(".option-text").textContent.trim();
    opt.classList.add("disabled");
    opt.classList.remove("selected");

    if (optText === q.correctAnswerText.trim()) {
      opt.classList.add("correct");
    } else if (optText === selectedText.trim()) {
      opt.classList.add("incorrect");
    }
  });

  // Hide submit button, show explanation
  const btn = activeTabPane ? activeTabPane.querySelector(`#submit-${qid}`) : null;
  if (btn) btn.style.display = "none";

  const explanation = activeTabPane ? activeTabPane.querySelector(`#explanation-${qid}`) : null;
  if (explanation) explanation.classList.add("visible");

  updateScoreMatrix();
  updateTabProgress();
};

// ============================================================
// SECTION 9: SCORE MATRIX & PROGRESS
// ============================================================

function updateScoreMatrix() {
  const totalQuestions = state.questions.length;
  const totalAnswered = Object.keys(state.submitted).length;
  let correctCount = 0;

  Object.keys(state.submitted).forEach(qid => {
    const q = state.questions.find(x => x.id === parseInt(qid));
    if (!q) return;

    const selectedText = state.answers[qid];
    if (selectedText === undefined || selectedText === null) return;

    if (selectedText.trim() === q.correctAnswerText.trim()) {
      correctCount++;
    }
  });

  const score = totalAnswered > 0 ? ((correctCount / totalAnswered) * 100).toFixed(1) : "0.0";
  const passing = parseFloat(score) >= 68;

  // Update header pills
  const progressPill = $("#pill-progress");
  const scorePill = $("#pill-score");
  const statusPill = $("#pill-status");

  if (progressPill) progressPill.querySelector(".pill-value").textContent = `${totalAnswered}/${totalQuestions}`;
  if (scorePill) scorePill.querySelector(".pill-value").textContent = `${score}%`;
  if (statusPill) {
    statusPill.querySelector(".pill-value").textContent = passing ? "Passing" : "Not Passing";
    statusPill.className = `score-pill ${passing ? "passing" : "failing"}`;
  }

  // Update dashboard stats
  const dashAnswered = $("#dash-answered");
  const dashCorrect = $("#dash-correct");
  const dashScore = $("#dash-score");

  if (dashAnswered) dashAnswered.textContent = totalAnswered;
  if (dashCorrect) dashCorrect.textContent = correctCount;
  if (dashScore) dashScore.textContent = totalAnswered > 0 ? `${score}%` : "—";
}

function updateTabProgress() {
  // Category tabs (1-6)
  for (let i = 1; i <= 5; i++) {
    const cat = TAB_CATEGORIES[i];
    const questions = state.questions.filter(q => q.category === cat);
    const answered = questions.filter(q => state.submitted[q.id]).length;
    const el = $(`#progress-${i}`);
    if (el) el.textContent = `${answered} / ${questions.length} Answered`;
  }

  // Full simulator tab
  const allAnswered = Object.keys(state.submitted).length;
  const el6 = $(`#progress-6`);
  if (el6) el6.textContent = `${allAnswered} / ${state.questions.length} Answered`;

  // Update dashboard category progress bars
  const topicKeys = [
    CATEGORIES.EMAIL,
    CATEGORIES.CONTENT,
    CATEGORIES.AUTOMATION,
    CATEGORIES.DATA,
    CATEGORIES.ANALYTICS
  ];
  topicKeys.forEach((cat, idx) => {
    const questions = state.questions.filter(q => q.category === cat);
    const answered = questions.filter(q => state.submitted[q.id]).length;
    const pct = questions.length > 0 ? Math.round((answered / questions.length) * 100) : 0;

    const fill = $(`#cat-progress-${idx}-fill`);
    const text = $(`#cat-progress-${idx}-text`);
    if (fill) fill.style.width = `${pct}%`;
    if (text) text.textContent = `${pct}% complete (${answered}/${questions.length})`;
  });
}

// ============================================================
// SECTION 10: MODE TOGGLE (STUDY / EXAM)
// ============================================================

function toggleMode(isExam) {
  state.mode = isExam ? "exam" : "study";

  const timer = $(".exam-timer");
  const submitExamBtn = $(".submit-exam-btn");

  if (isExam) {
    // Reset state for exam mode
    state.answers = {};
    state.submitted = {};
    state.shuffleMap = {};
    state.examSubmitted = false;
    state.timerSeconds = 105 * 60;

    // Re-render quiz tabs with fresh shuffles
    renderAllQuizTabs();
    updateScoreMatrix();
    updateTabProgress();

    // Start timer
    timer.classList.add("visible");
    submitExamBtn.classList.add("visible");
    startTimer();

    // Switch to full exam tab
    setActiveTab(6);
  } else {
    // Reset state for study mode
    state.answers = {};
    state.submitted = {};
    state.shuffleMap = {};

    stopTimer();
    timer.classList.remove("visible");
    timer.classList.remove("warning");
    submitExamBtn.classList.remove("visible");

    renderAllQuizTabs();
    updateScoreMatrix();
    updateTabProgress();
    setActiveTab(0);
  }
}

// ============================================================
// SECTION 11: EXAM TIMER
// ============================================================

function startTimer() {
  stopTimer();
  updateTimerDisplay();
  state.timerInterval = setInterval(() => {
    state.timerSeconds--;
    if (state.timerSeconds <= 0) {
      stopTimer();
      submitExam();
    }
    // Add warning pulse when less than 5 minutes remain
    if (state.timerSeconds <= 300) {
      $(".exam-timer").classList.add("warning");
    }
    updateTimerDisplay();
  }, 1000);
}

function stopTimer() {
  if (state.timerInterval) {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
  }
}

function updateTimerDisplay() {
  const hours = Math.floor(state.timerSeconds / 3600);
  const mins = Math.floor((state.timerSeconds % 3600) / 60);
  const secs = state.timerSeconds % 60;
  const display = `${hours > 0 ? hours + ':' : ''}${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  const timerText = $("#timer-text");
  if (timerText) timerText.textContent = display;
}

// ============================================================
// SECTION 12: EXAM SUBMISSION & RESULTS
// ============================================================

function submitExam() {
  if (state.examSubmitted) return;
  state.examSubmitted = true;
  stopTimer();

  // Calculate results per category
  let totalCorrect = 0;
  const sectionResults = {};

  Object.values(CATEGORIES).forEach(cat => {
    sectionResults[cat] = { total: 0, correct: 0 };
  });

  state.questions.forEach(q => {
    sectionResults[q.category].total++;
    const selectedText = state.answers[q.id];

    if (selectedText !== undefined && selectedText !== null) {
      if (selectedText.trim() === q.correctAnswerText.trim()) {
        totalCorrect++;
        sectionResults[q.category].correct++;
      }
    }
  });

  const totalQuestions = state.questions.length;
  const totalAnswered = Object.keys(state.submitted).length;
  const score = ((totalCorrect / totalQuestions) * 100).toFixed(1);
  const passed = parseFloat(score) >= 68;

  showResultsModal(totalAnswered, totalCorrect, score, passed, sectionResults);
}

function showResultsModal(answered, correct, score, passed, sections) {
  const overlay = $(".results-overlay");
  const circumference = 2 * Math.PI * 65;
  const offset = circumference - (parseFloat(score) / 100) * circumference;
  const strokeColor = passed ? "var(--color-correct)" : "var(--color-incorrect)";

  const totalQuestions = state.questions.length;

  const modal = overlay.querySelector(".results-modal");
  modal.innerHTML = `
    <h2>${passed ? "🎉 Congratulations!" : "📝 Keep Studying!"}</h2>
    <p class="result-subtitle">${passed ? "You passed the practice exam!" : "You didn't reach the 68% passing threshold."}</p>

    <div class="result-score-ring">
      <svg viewBox="0 0 140 140">
        <circle class="ring-bg" cx="70" cy="70" r="65"/>
        <circle class="ring-progress" cx="70" cy="70" r="65"
          stroke="${strokeColor}"
          stroke-dasharray="${circumference}"
          stroke-dashoffset="${offset}"/>
      </svg>
      <div class="ring-text" style="color:${strokeColor}">
        ${score}%
        <span>Score</span>
      </div>
    </div>

    <div class="results-breakdown">
      <div class="result-stat ${passed ? 'pass' : 'fail'}">
        <div class="rs-value">${correct}/${totalQuestions}</div>
        <div class="rs-label">Correct</div>
      </div>
      <div class="result-stat">
        <div class="rs-value">${answered}</div>
        <div class="rs-label">Answered</div>
      </div>
      <div class="result-stat">
        <div class="rs-value">${totalQuestions - answered}</div>
        <div class="rs-label">Unanswered</div>
      </div>
      <div class="result-stat ${passed ? 'pass' : 'fail'}">
        <div class="rs-value">${passed ? "PASS" : "FAIL"}</div>
        <div class="rs-label">Status (≥68%)</div>
      </div>
    </div>

    <table class="results-section-table">
      <thead>
        <tr><th>Section</th><th>Weight</th><th>Score</th><th>Result</th></tr>
      </thead>
      <tbody>
        ${Object.entries(sections).map(([name, data]) => {
    const pct = data.total > 0 ? ((data.correct / data.total) * 100).toFixed(0) : 0;
    const weight = CATEGORY_WEIGHTS[name] || "—";
    return `<tr>
            <td>${name}</td>
            <td>${weight}</td>
            <td>${data.correct}/${data.total} (${pct}%)</td>
            <td style="color:${pct >= 68 ? 'var(--color-correct)' : 'var(--color-incorrect)'}">${pct >= 68 ? "✓ Pass" : "✕ Needs Work"}</td>
          </tr>`;
  }).join("")}
      </tbody>
    </table>

    <button class="results-close-btn" onclick="closeResults()">Review Answers</button>
  `;

  overlay.classList.add("visible");
}

window.closeResults = function () {
  $(".results-overlay").classList.remove("visible");

  // Show correct/incorrect feedback on all questions after exam review
  state.questions.forEach(q => {
    const selectedText = state.answers[q.id];
    const isCorrect = (selectedText !== undefined && selectedText !== null)
      ? selectedText.trim() === q.correctAnswerText.trim()
      : false;

    // Find the cards across all tabs in the DOM
    const cards = $$(`#qcard-${q.id}`);
    cards.forEach(card => {
      card.classList.add(isCorrect ? "answered-correct" : "answered-incorrect");

      const options = card.querySelectorAll(".option-item");
      options.forEach(opt => {
        const optText = opt.querySelector(".option-text").textContent.trim();
        opt.classList.add("disabled");
        opt.classList.remove("selected");

        if (optText === q.correctAnswerText.trim()) {
          opt.classList.add("correct");
        } else if (selectedText && optText === selectedText.trim()) {
          opt.classList.add("incorrect");
        }
      });

      const explanation = card.querySelector(`.explanation-panel`);
      if (explanation) explanation.classList.add("visible");

      const btn = card.querySelector(`.btn-submit`);
      if (btn) btn.style.display = "none";
    });
  });
};

// ============================================================
// SECTION 13: EVENT BINDINGS
// ============================================================

function bindEvents() {
  // Tab clicks (delegated)
  document.addEventListener("click", (e) => {
    const tabBtn = e.target.closest(".tab-btn");
    if (tabBtn) {
      setActiveTab(parseInt(tabBtn.dataset.tab));
    }
  });

  // Mode toggle
  const toggle = $("#mode-toggle");
  if (toggle) {
    toggle.addEventListener("change", (e) => {
      if (e.target.checked) {
        if (confirm("Switching to Exam Mode will reset all your answers and start a 105-minute timer. Continue?")) {
          toggleMode(true);
        } else {
          e.target.checked = false;
        }
      } else {
        if (confirm("Switching back to Study Mode will reset your exam progress. Continue?")) {
          toggleMode(false);
        } else {
          e.target.checked = true;
        }
      }
    });
  }

  // Submit exam button
  const submitBtn = $(".submit-exam-btn");
  if (submitBtn) {
    submitBtn.addEventListener("click", () => {
      if (confirm("Are you sure you want to submit the exam? You cannot change answers after submitting.")) {
        submitExam();
      }
    });
  }
}

// ============================================================
// SECTION 14: UTILITY FUNCTIONS
// ============================================================

function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  return a.every((val, i) => val === b[i]);
}

// ============================================================
// SECTION 15: INITIALIZATION
// ============================================================

document.addEventListener("DOMContentLoaded", async () => {
  // Check for stored session
  if (sessionStorage.getItem("simulator_unlocked") === "true") {
    unlockApp(true);
  }

  // Fetch and parse the markdown question bank
  const questions = await fetchAndParseQuestions();

  if (questions.length === 0) {
    // Error state already handled in fetchAndParseQuestions
    return;
  }

  // Store parsed questions in global state (original sequential order)
  state.questions = questions;

  // Hide loading overlay
  const loadingOverlay = document.getElementById("loading-overlay");
  if (loadingOverlay) {
    loadingOverlay.classList.add("hidden");
  }

  // Build the application
  renderTabButtons();
  renderDashboard();
  renderAllQuizTabs();
  updateScoreMatrix();
  updateTabProgress();
  bindEvents();
  setActiveTab(0);
});
