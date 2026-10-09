// Bangla dictionary.
// Where the natural Bangla phrasing is non-obvious or context-dependent,
// the line is annotated with `// uncertain` so a native reviewer can audit.
import type { Dictionary } from "./types";

export const bn: Dictionary = {
  // common
  "common.appName": "লোন রিমাইন্ডার",
  "common.tagline": "আপনি যে টাকা ধার দেন তার হিসাব রাখুন।",
  "common.save": "পরিবর্তন সংরক্ষণ",
  "common.cancel": "বাতিল",
  "common.delete": "মুছুন",
  "common.edit": "সম্পাদনা",
  "common.back": "ফিরে যান",
  "common.close": "বন্ধ",
  "common.confirm": "নিশ্চিত করুন",
  "common.loading": "লোড হচ্ছে…",
  "common.empty": "এখনো কিছু নেই।",
  "common.optional": "ঐচ্ছিক",
  "common.required": "আবশ্যক",
  "common.today": "আজ",
  "common.yesterday": "গতকাল",
  "common.earlier": "আগে",
  "common.all": "সব",
  "common.search": "অনুসন্ধান",
  "common.justNow": "এখনই",
  "common.ago": (m) => `${m} মিনিট আগে`,
  "common.hoursAgo": (h) => `${h} ঘণ্টা আগে`,
  "common.daysAgo": (d) => `${d} দিন আগে`,
  "common.unread": "অপঠিত",
  "common.unreadCount": (n) =>
    n === 1 ? "১টি অপঠিত" : `${n}টি অপঠিত`, // uncertain — plural form
  "common.seeAll": "সব দেখুন",
  "common.open": "খুলুন",
  "common.actions": "কার্যক্রম",
  "common.more": "আরও",

  // nav
  "nav.dashboard": "ড্যাশবোর্ড",
  "nav.loans": "ঋণ",
  "nav.friends": "বন্ধুরা",
  "nav.reminders": "রিমাইন্ডার",
  "nav.reports": "রিপোর্ট",
  "nav.settings": "সেটিংস",
  "nav.notifications": "বিজ্ঞপ্তি",
  "nav.logOut": "লগ আউট",
  "nav.logIn": "লগ ইন",
  "nav.signUp": "সাইন আপ",
  "nav.features": "বৈশিষ্ট্য",
  "nav.howItWorks": "কীভাবে কাজ করে",
  "nav.getStarted": "শুরু করুন",
  "nav.language": "ভাষা",
  "nav.english": "English",
  "nav.bangla": "বাংলা",
  "nav.openMenu": "মেনু খুলুন",
  "nav.closeMenu": "মেনু বন্ধ করুন",
  "nav.mainNavigation": "প্রধান নেভিগেশন",
  "nav.more": "আরও",

  // top bar
  "topbar.searchPlaceholder": "ঋণ খুঁজুন…",
  "topbar.search": "ঋণ খুঁজুন",
  "topbar.toggleTheme": "থিম পরিবর্তন",
  "topbar.profileMenu": "প্রোফাইল মেনু",
  "topbar.profileAndSettings": "প্রোফাইল ও সেটিংস",
  "topbar.reminderHistory": "রিমাইন্ডার ইতিহাস",
  "topbar.reports": "রিপোর্ট",

  // validation
  "validation.required": "এই ক্ষেত্রটি পূরণ করা আবশ্যক।",
  "validation.email": "একটি বৈধ ইমেইল ঠিকানা দিন।",
  "validation.minLength": (n) => `অন্তত ${n}টি অক্ষর ব্যবহার করুন।`,
  "validation.passwordLength": "অন্তত ৮টি অক্ষর ব্যবহার করুন।",
  "validation.passwordsDontMatch": "পাসওয়ার্ড মিলছে না।",
  "validation.phone": "একটি বৈধ ফোন নম্বর দিন",
  "validation.amount": "একটি বৈধ পরিমাণ দিন।",
  "validation.amountPositive": "পরিমাণ অবশ্যই ০ এর বেশি হতে হবে।",
  "validation.amountExceedsRemaining": (max) =>
    `পরিমাণ ${max} এর বেশি হতে পারবে না।`,
  "validation.dueAfterGiven":
    "ফেরতের তারিখ অবশ্যই ধার দেওয়ার তারিখের পরে হতে হবে।",
  "validation.dueFuture": "ভবিষ্যতের একটি তারিখ বাছাই করুন।",
  "validation.nameRequired": "আপনার বন্ধুর পুরো নাম লিখুন।",
  "validation.consentRequired":
    "সংরক্ষণ করার আগে অনুগ্রহ করে নিশ্চিত করুন।",

  // auth
  "auth.logInTitle": "স্বাগতম",
  "auth.logInSubtitle":
    "আপনার লোন রিমাইন্ডার অ্যাকাউন্টে লগ ইন করুন।",
  "auth.signUpTitle": "আপনার অ্যাকাউন্ট তৈরি করুন",
  "auth.signUpSubtitle":
    "ঋণের হিসাব রাখুন, রিমাইন্ডার পাঠান, বন্ধুত্ব বজায় রাখুন।",
  "auth.email": "ইমেইল",
  "auth.password": "পাসওয়ার্ড",
  "auth.fullName": "পুরো নাম",
  "auth.forgotPassword": "পাসওয়ার্ড ভুলে গেছেন?",
  "auth.incorrectPassword": "ভুল পাসওয়ার্ড।",
  "auth.continueWithGoogle": "Google দিয়ে চালিয়ে যান",
  "auth.noAccount": "অ্যাকাউন্ট নেই?",
  "auth.hasAccount": "ইতিমধ্যে অ্যাকাউন্ট আছে?",
  "auth.useMinChars": "অন্তত ৮টি অক্ষর ব্যবহার করুন।",
  "auth.agreeTerms": (a, b) =>
    `আমি ${a} এবং ${b} পড়েছি এবং সম্মত আছি।`, // uncertain — natural phrasing
  "auth.dividerOr": "অথবা",
  "auth.privacyNotice": "আপনার ডেটা এনক্রিপ্ট করা এবং শুধুমাত্র আপনার কাছে দৃশ্যমান।",
  "auth.passwordPlaceholder": "অন্তত ৮ অক্ষর",
  "auth.signUpFailed": "সাইন আপ ব্যর্থ হয়েছে।",
  "auth.continueWith": "দিয়ে চালিয়ে যান",
  "auth.eyebrow.calm": "ধার দেওয়ার আরও শান্ত একটি উপায়।",
  "auth.showPassword": "পাসওয়ার্ড দেখান",
  "auth.hidePassword": "পাসওয়ার্ড লুকান",
  "auth.brandHome": "লোন রিমাইন্ডার হোম",
  "auth.sendLink": "লিংক পাঠান",
  "auth.creatingAccount": "অ্যাকাউন্ট তৈরি হচ্ছে…",
  "auth.loggingIn": "লগ ইন হচ্ছে…",
  "auth.checkEmailHint": "লিংকের জন্য আপনার ইমেইল দেখুন।",
  "auth.resendHint": "আরেকটি লিংক পাঠানো হচ্ছে…",
  "auth.checkInboxHeading": "আপনার ইনবক্স দেখুন",
  "auth.checkInboxBody": "যদি ওই ইমেইলে কোনো অ্যাকাউন্ট থাকে, আমরা একটি রিসেট লিংক পাঠিয়েছি।",
  "auth.tokenMissingTitle": "রিসেট লিংক পাওয়া যাচ্ছে না",
  "auth.tokenMissingBody": "আবার আপনার ইমেইলের লিংকটি খুলুন।",
  "auth.rateLimited":
    "অনেক চেষ্টা হয়েছে। কয়েক মিনিট অপেক্ষা করে আবার চেষ্টা করুন।",
  "auth.tokenInvalid":
    "এই রিসেট লিংকটি সঠিক নয় বা মেয়াদ শেষ। নতুন একটি লিংকের অনুরোধ করুন।",
  "auth.updating": "আপডেট হচ্ছে…",
  "auth.resetTitle": "পাসওয়ার্ড রিসেট করুন",
  "auth.resetSubtitle":
    "আবার লগ ইন করতে একটি নতুন পাসওয়ার্ড দিন।",
  "auth.newPassword": "নতুন পাসওয়ার্ড",
  "auth.confirmPassword": "পাসওয়ার্ড নিশ্চিত করুন",
  "auth.sendReset": "রিসেট লিংক পাঠান",
  "auth.backToLogin": "লগ ইন এ ফিরে যান",
  "auth.resetSent": "আপনার ইনবক্স দেখুন।",
  "auth.checkInbox":
    "যদি ওই ইমেইলে কোনো অ্যাকাউন্ট থাকে, আমরা একটি রিসেট লিংক পাঠিয়েছি।", // uncertain
  "auth.resend": "আবার পাঠান",
  "auth.forgotTitle": "পাসওয়ার্ড ভুলে গেছেন?",
  "auth.forgotSubtitle":
    "আপনার ইমেইল দিন, আমরা একটি রিসেট লিংক পাঠাবো।",
  "auth.passwordReset": "পাসওয়ার্ড আপডেট হয়েছে",
  "auth.passwordResetSub":
    "আপনার পাসওয়ার্ড পরিবর্তন করা হয়েছে। নতুন পাসওয়ার্ড দিয়ে এখন লগ ইন করতে পারেন।",
  "auth.goToLogin": "লগ ইন এ যান",

  // dashboard
  "dashboard.goodMorning": "সুপ্রভাত",
  "dashboard.goodAfternoon": "নমস্কার",
  "dashboard.goodEvening": "শুভ সন্ধ্যা",
  "dashboard.goodNight": "শুভ রাত্রি",
  "dashboard.totalLent": "মোট ধার",
  "dashboard.totalReceived": "মোট ফেরত",
  "dashboard.pending": "বকেয়া",
  "dashboard.overdue": "বিলম্বিত",
  "dashboard.activeLoans": (n) =>
    n === 1 ? "১টি সক্রিয় ঋণ" : `${n}টি সক্রিয় ঋণ`, // uncertain — plural
  "dashboard.dueLoans": (n) =>
    n === 1 ? "১টি ঋণ বকেয়া" : `${n}টি ঋণ বকেয়া`, // uncertain — plural
  "dashboard.recent": "সাম্প্রতিক ঋণ",
  "dashboard.addLoan": "নতুন ঋণ",
  "dashboard.paidBack": (n) =>
    n === 1 ? "১টি পরিশোধিত" : `${n}টি পরিশোধিত`, // uncertain
  "dashboard.awaiting": (n) =>
    n === 1 ? "১টি বকেয়া" : `${n}টি বকেয়া`, // uncertain
  "dashboard.pastDue": (n) =>
    n === 1 ? "১টি বিলম্বিত" : `${n}টি বিলম্বিত`, // uncertain
  "dashboard.overdueNotice": (n) =>
    n === 1
      ? "১টি ঋণ বিলম্বিত। আজ একটি আলতো রিমাইন্ডার নির্ধারিত।"
      : `${n}টি ঋণ বিলম্বিত। আজ একটি আলতো রিমাইন্ডার নির্ধারিত।`, // uncertain
  "dashboard.paidOn": (date) => `${date} পরিশোধিত`,
  "dashboard.emptyStateTitle": "এখনো কিছু যোগ করা হয়নি",
  "dashboard.emptyStateBody":
    "আপনার প্রথম ঋণ যোগ করুন, ড্যাশবোর্ড ভরে উঠুক।",
  "dashboard.cta": "আপনার প্রথম ঋণ যোগ করুন",
  "dashboard.seeAll": "সব দেখুন",

  // loans list
  "loans.title": "আপনার ঋণসমূহ",
  "loans.subtitle": "প্রতিটি ঋণ, স্পষ্টভাবে মনে রাখা।",
  "loans.count": (n) => `${n}টি ঋণ`, // uncertain — plural
  "loans.searchPlaceholder": "বন্ধুর নামে খুঁজুন…",
  "loans.chip.all": "সব",
  "loans.chip.pending": "বকেয়া",
  "loans.chip.overdue": "বিলম্বিত",
  "loans.chip.paid": "পরিশোধিত",
  "loans.sort.dueDate": "ফেরতের তারিখ",
  "loans.sort.amount": "পরিমাণ",
  "loans.overdueBy": (n) =>
    n === 1 ? "১ দিন বিলম্বিত" : `${n} দিন বিলম্বিত`, // uncertain — plural
  "loans.dueIn": (n) =>
    n === 1 ? "১ দিনের মধ্যে বকেয়া" : `${n} দিনের মধ্যে বকেয়া`, // uncertain — plural
  "loans.partial": (paid, total) => `${total} থেকে ${paid} পরিশোধিত`,
  "loans.rescheduled": "পুনঃনির্ধারিত",
  "loans.empty.title": "কোনো ঋণ নেই",
  "loans.empty.body": "কে কত ধার নিয়েছে তার হিসাব রাখতে একটি ঋণ যোগ করুন।",
  "loans.menu.view": "দেখুন",
  "loans.menu.edit": "সম্পাদনা",
  "loans.menu.markPaid": "পরিশোধিত হিসেবে চিহ্নিত করুন",
  "loans.menu.delete": "মুছুন",

  // loan details
  "loanDetails.backToLoans": "ঋণের তালিকায় ফিরে যান",
  "loanDetails.recordPayment": "পেমেন্ট রেকর্ড করুন",
  "loanDetails.markFullyPaid": "সম্পূর্ণ পরিশোধিত হিসেবে চিহ্নিত করুন",
  "loanDetails.sendReminder": "এখনই রিমাইন্ডার পাঠান",
  "loanDetails.reschedule": "পুনঃনির্ধারণ",
  "loanDetails.edit": "সম্পাদনা",
  "loanDetails.delete": "মুছুন",
  "loanDetails.paid": (amount) => `${amount} পরিশোধিত`,
  "loanDetails.remaining": (amount) => `${amount} বকেয়া`,
  "loanDetails.dueDate": "ফেরতের তারিখ",
  "loanDetails.givenDate": "ধার দেওয়ার তারিখ",
  "loanDetails.timeline": "টাইমলাইন",
  "loanDetails.loanGiven": (amount, name, date) =>
    `${date} তারিখে ${name} কে ${amount} ধার দেওয়া হয়েছে`,
  "loanDetails.reminderScheduled": "রিমাইন্ডার নির্ধারিত",
  "loanDetails.timelinePaid": (date) => `${date} পরিশোধিত হিসেবে চিহ্নিত`,
  "loanDetails.timelineUpcoming": (date) => `${date} এ প্রত্যাশিত`,
  "loanDetails.timelinePayment": (amount, date) =>
    `${date} তারিখে ${amount} পেমেন্ট রেকর্ড করা হয়েছে`,
  "loanDetails.timelineReschedule": (from, to) =>
    `ফেরতের তারিখ ${from} থেকে ${to} এ সরানো হয়েছে`,
  "loanDetails.paymentHistory": "পেমেন্ট ইতিহাস",
  "loanDetails.paymentHistoryEmpty": "এখনো কোনো পেমেন্ট নেই",
  "loanDetails.deletePaymentTitle": "এই পেমেন্ট মুছবেন?",
  "loanDetails.deletePaymentBody": (amount) =>
    `${amount} পেমেন্টটি মুছে যাবে এবং বকেয়া হিসাব আপডেট হবে।`,
  "loanDetails.rescheduleHistory": "ফেরতের তারিখের পরিবর্তন",
  "loanDetails.privateNotes": "ব্যক্তিগত নোট",
  "loanDetails.deleteTitle": (name) => `${name} এর ঋণ মুছবেন?`,
  "loanDetails.deleteBody": (name, amount) =>
    `${name} এর ${amount} ঋণ এবং এর রিমাইন্ডার ইতিহাস স্থায়ীভাবে মুছে যাবে। এটি আর ফিরিয়ে আনা যাবে না।`,
  "loanDetails.keepLoan": "ঋণ রাখুন",
  "loanDetails.toast.paymentRecorded": "পেমেন্ট রেকর্ড হয়েছে।",
  "loanDetails.toast.loanSaved":
    "ঋণ সংরক্ষিত হয়েছে। রিমাইন্ডার নির্ধারিত।",
  "loanDetails.toast.markedPaid": "পরিশোধিত হিসেবে চিহ্নিত।",
  "loanDetails.toast.reminderSent": "রিমাইন্ডার পাঠানো হয়েছে।",
  "loanDetails.toast.dueDateUpdated": "ফেরতের তারিখ আপডেট হয়েছে।",
  "loanDetails.toast.loanDeleted": "ঋণ মুছে ফেলা হয়েছে।",
  "loanDetails.toast.paymentDeleted": "পেমেন্ট মুছে ফেলা হয়েছে।",

  // payment modal
  "payment.title": "পেমেন্ট রেকর্ড করুন",
  "payment.amount": "পরিমাণ",
  "payment.date": "তারিখ",
  "payment.method": "মাধ্যম",
  "payment.note": "নোট (ঐচ্ছিক)",
  "payment.method.cash": "নগদ",
  "payment.method.bkash": "বিকাশ",
  "payment.method.nagad": "নগদ (Nagad)",
  "payment.method.bank": "ব্যাংক",
  "payment.method.other": "অন্যান্য",
  "payment.save": "পেমেন্ট রেকর্ড করুন",
  "payment.remaining": (amount) => `${amount} বকেয়া`,
  "payment.exceedsRemaining": (max) =>
    `পরিমাণ ${max} এর বেশি হতে পারবে না।`,

  // reschedule modal
  "reschedule.title": "ফেরতের তারিখ পুনঃনির্ধারণ",
  "reschedule.currentDue": "বর্তমান ফেরতের তারিখ",
  "reschedule.newDue": "নতুন ফেরতের তারিখ",
  "reschedule.reason": "কারণ (ঐচ্ছিক)",
  "reschedule.reasonPlaceholder":
    "যেমন: বন্ধু আরেকটু সময় চেয়েছেন",
  "reschedule.notifyFriend":
    "নতুন তারিখ সম্পর্কে আমার বন্ধুকে জানান",
  "reschedule.save": "নতুন তারিখ সংরক্ষণ",

  // loan form
  "form.friendDetails": "বন্ধুর তথ্য",
  "form.loanDetails": "ঋণের বিবরণ",
  "form.tone": "টোন",
  "form.reminders": "রিমাইন্ডার",
  "form.consentLabel": "আমি আমার বন্ধুকে জানাবো",
  "form.consentBody":
    "আমি আমার বন্ধুকে জানাবো যে তিনি রিমাইন্ডার পেতে পারেন।",
  "form.fullName": "পুরো নাম",
  "form.phone": "ফোন",
  "form.phoneHelper": "ফরম্যাট: +৮৮০ ১XXXXXXXXX",
  "form.emailOptional": "ইমেইল (ঐচ্ছিক)",
  "form.emailHelper":
    "ইমেইল রিমাইন্ডার চালু করতে একটি ইমেইল যোগ করুন।",
  "form.amount": "পরিমাণ",
  "form.dateGiven": "ধার দেওয়ার তারিখ",
  "form.dueDate": "ফেরতের তারিখ",
  "form.toneFriendly": "বন্ধুসুলভ",
  "form.toneNeutral": "নিরপেক্ষ",
  "form.toneFirm": "একগুঁয়ে",
  "form.smsReminder": "SMS রিমাইন্ডার",
  "form.emailReminder": "ইমেইল রিমাইন্ডার",
  "form.note": "ব্যক্তিগত নোট",
  "form.noteHelper": "শুধুমাত্র আপনি দেখতে পাবেন।",
  "form.save": "ঋণ সংরক্ষণ",
  "form.loanSaved": "ঋণ সংরক্ষিত হয়েছে। রিমাইন্ডার নির্ধারিত।",
  "form.title.new": "নতুন ঋণ যোগ করুন",
  "form.title.edit": "ঋণ সম্পাদনা",
  "form.cancel": "বাতিল",
  "form.messageLanguage": "বার্তার ভাষা",
  "form.messageLanguage.en": "English",
  "form.messageLanguage.bn": "বাংলা",
  "form.messageLanguage.useDefault": "ডিফল্ট ব্যবহার করুন",

  // reminders
  "reminders.title": "রিমাইন্ডার সেটিংস",
  "reminders.friendly.title": "আন্তরিক রিমাইন্ডার",
  "reminders.friendly.desc":
    "উষ্ণ ও বোধগম্য, আলোচনার জায়গা রেখে।", // uncertain
  "reminders.neutral.title": "নিরপেক্ষ, তবে শ্রদ্ধাশীল।",
  "reminders.neutral.desc":
    "সরল ও বিবেচক।",
  "reminders.firm.title": "একগুঁয়ে, তবে শ্রদ্ধাশীল।",
  "reminders.firm.desc":
    "সরাসরি, তবে দরজা খোলাই থাকে।", // uncertain
  "reminders.sms": "SMS টেমপ্লেট",
  "reminders.email": "ইমেইল টেমপ্লেট",
  "reminders.smsPreview": "SMS প্রিভিউ",
  "reminders.emailPreview": "ইমেইল প্রিভিউ",
  "reminders.placeholders": "প্লেসহোল্ডার",
  "reminders.defaults": "ডিফল্ট পছন্দসমূহ",
  "reminders.defaultsHelper":
    "নতুন ঋণে প্রযোজ্য। আপনি বন্ধুভেদে এগুলো সামঞ্জস্য করতে পারবেন।",
  "reminders.save": "পরিবর্তন সংরক্ষণ",
  "reminders.saved": "রিমাইন্ডার সেটিংস সংরক্ষিত।",
  "reminders.charsAndSegments": (chars, segments, maxChars) =>
    `${chars} অক্ষর · ${segments} সেগমেন্ট (প্রতি সেগমেন্টে ${maxChars}টি)`,
  "reminders.banglaSegmentHint":
    "বাংলা ইউনিকোড SMS এ প্রতি সেগমেন্টে ৭০টি অক্ষর।",
  "reminders.messageLanguage": "বার্তার ভাষা",
  "reminders.messageLanguage.en": "English",
  "reminders.messageLanguage.bn": "বাংলা",
  "reminders.preview": "প্রিভিউ",
  "reminders.from": "প্রেরক",
  "reminders.to": "প্রাপক",
  "reminders.subject": "বিষয়",
  "reminders.message": "বার্তা",
  "reminders.history.title": "রিমাইন্ডার ইতিহাস",
  "reminders.history.totalSent": "মোট পাঠানো",
  "reminders.history.delivered": "পৌঁছেছে",
  "reminders.history.failed": "ব্যর্থ",
  "reminders.history.empty.title": "এখনো কোনো রিমাইন্ডার পাঠানো হয়নি",
  "reminders.history.empty.body":
    "আপনার পাঠানো রিমাইন্ডার এবং তাদের ডেলিভারি স্ট্যাটাস এখানে দেখা যাবে।",

  // friends
  "friends.title": "বন্ধুরা",
  "friends.subtitle": "আপনি যাঁদের ধার দিয়েছেন, এক জায়গায়।",
  "friends.empty.title": "এখনো কোনো বন্ধু নেই",
  "friends.empty.body": "আপনার পরিচিতদের হিসাব রাখতে একটি ঋণ যোগ করুন।",
  "friends.totalLent": "মোট ধার",
  "friends.outstanding": "বকেয়া",
  "friends.loanCount": (n) =>
    n === 1 ? "১টি ঋণ" : `${n}টি ঋণ`, // uncertain — plural

  // notifications
  "notifications.title": "বিজ্ঞপ্তি",
  "notifications.markAllRead": "সব পঠিত হিসেবে চিহ্নিত করুন",
  "notifications.viewAll": "সব দেখুন",
  "notifications.empty": "সব পড়া হয়ে গেছে।",
  "notifications.unreadLabel": (n) =>
    n === 1 ? "১টি নতুন" : `${n}টি নতুন`, // uncertain

  // settings
  "settings.title": "সেটিংস",
  "settings.subtitle": "আপনার অ্যাকাউন্ট, আপনার পছন্দ।",
  "settings.profile": "প্রোফাইল",
  "settings.appearance": "চেহারা",
  "settings.notifications": "বিজ্ঞপ্তি",
  "settings.security": "নিরাপত্তা",
  "settings.account": "অ্যাকাউন্ট",
  "settings.displayName": "প্রদর্শন নাম",
  "settings.emailLabel": "ইমেইল",
  "settings.phoneLabel": "ফোন",
  "settings.save": "পরিবর্তন সংরক্ষণ",
  "settings.profileSaved": "প্রোফাইল আপডেট হয়েছে।",
  "settings.theme": "থিম",
  "settings.theme.light": "হালকা",
  "settings.theme.dark": "গাঢ়",
  "settings.theme.system": "সিস্টেম",
  "settings.themeHelper": "লোন রিমাইন্ডার কেমন দেখাবে তা বেছে নিন।",
  "settings.banglaNumerals": "বাংলা সংখ্যা ব্যবহার করুন",
  "settings.banglaNumeralsHelper":
    "পরিমাণ ও তারিখ ০-৯ এর পরিবর্তে ০-৯ এ দেখান।", // uncertain
  "settings.notifEmailOnPaid":
    "ঋণ পরিশোধিত হলে আমাকে ইমেইল করুন",
  "settings.notifEmailOnOverdue":
    "ঋণ বিলম্বিত হলে আমাকে ইমেইল করুন",
  "settings.notifWeeklySummary": "সাপ্তাহিক সারাংশ পাঠান",
  "settings.currentPassword": "বর্তমান পাসওয়ার্ড",
  "settings.newPassword": "নতুন পাসওয়ার্ড",
  "settings.confirmPassword": "নতুন পাসওয়ার্ড নিশ্চিত করুন",
  "settings.passwordChanged": "পাসওয়ার্ড পরিবর্তন হয়েছে।",
  "settings.deleteAccount": "অ্যাকাউন্ট মুছুন",
  "settings.deleteAccountBody":
    "আপনার অ্যাকাউন্ট এবং সমস্ত ডেটা স্থায়ীভাবে মুছে যাবে। এটি আর ফিরিয়ে আনা যাবে না।",
  "settings.accountDeleted": "অ্যাকাউন্ট মুছে ফেলা হয়েছে।",
  "settings.reportsLink": "রিপোর্ট খুলুন",

  // reports
  "reports.title": "রিপোর্ট",
  "reports.subtitle": "আপনার ধার দেওয়া কেমন চলছে।",
  "reports.range.3m": "গত ৩ মাস",
  "reports.range.6m": "গত ৬ মাস",
  "reports.range.12m": "গত ১২ মাস",
  "reports.range.all": "সব সময়",
  "reports.totalLent": "মোট ধার",
  "reports.totalReceived": "মোট ফেরত",
  "reports.outstanding": "বকেয়া",
  "reports.onTimeRate": "সময়মতো ফেরত",
  "reports.lentVsReceived": "ধার বনাম ফেরত",
  "reports.lentVsReceivedTable": "মাসভিত্তিক টেবিল",
  "reports.lent": "ধার",
  "reports.received": "ফেরত",
  "reports.month": "মাস",
  "reports.statusBreakdown": "ঋণের অবস্থা",
  "reports.status.paid": "পরিশোধিত",
  "reports.status.pending": "বকেয়া",
  "reports.status.overdue": "বিলম্বিত",
  "reports.topBorrowers": "শীর্ষ ঋণগ্রহীতা",
  "reports.avgRepayTime": (d) =>
    d === 1 ? "গড়ে ১ দিনে ফেরত" : `গড়ে ${d} দিনে ফেরত`, // uncertain
  "reports.reliability": "বন্ধুদের নির্ভরযোগ্যতা",
  "reports.reliability.always": "সবসময় সময়মতো",
  "reports.reliability.sometimes": "মাঝে মাঝে দেরি",
  "reports.reliability.often": "প্রায়ই দেরি",
  "reports.upcoming": "এই সপ্তাহে বকেয়া",
  "reports.upcomingEmpty": "পরবর্তী ৭ দিনে কিছু বকেয়া নেই।",
  "reports.upcomingNext": (n) =>
    n === 1 ? "১টি ঋণ বকেয়া" : `${n}টি ঋণ বকেয়া`, // uncertain
  "reports.exportCsv": "CSV রপ্তানি",
  "reports.empty.title": "এই সময়সীমায় কোনো ডেটা নেই",
  "reports.empty.body":
    "ঋণ ও পেমেন্ট রেকর্ড করলে আপনার রিপোর্ট এখানে ভরে উঠবে।",
  "reports.openBorrower": "বন্ধুর পাতা খুলুন",

  // landing
  "landing.eyebrow": "কম তাড়াহুড়া। বেশি শান্তি।",
  "landing.hero.title": "আর ঋণ তাড়া করতে হবে না",
  "landing.hero.subtitle":
    "আপনি যে টাকা ধার দেন তার হিসাব রাখুন, আলতো রিমাইন্ডার পাঠান, আর বন্ধুত্বকে টাকার চেয়ে বেশি কিছু রাখুন।", // uncertain
  "landing.cta": "শুরু করুন",
  "landing.ctaHelper": "একটু কম মনে রাখার দায়িত্ব।",
  "landing.privacy":
    "গোপনীয়তা ডিজাইনের অংশ। বাংলাদেশের জন্য তৈরি।", // uncertain
  "landing.features.title": "ধার দেওয়ার একটি সুন্দর উপায়।",
  "landing.features.subtitle":
    "মনে রাখার যা দরকার। অপ্রয়োজনীয় কিছু নয়।",
  "landing.features.track.title": "ঋণের হিসাব",
  "landing.features.track.body":
    "কাকে কত ধার দিলেন, কবে বকেয়া, কত ফিরে পেলেন — সব এক নজরে।",
  "landing.features.reminders.title": "স্বয়ংক্রিয় রিমাইন্ডার",
  "landing.features.reminders.body":
    "সময়মতো শ্রদ্ধাশীল SMS বা ইমেইল। অস্বস্তিকর ফলো-আপের দরকার নেই।",
  "landing.features.notes.title": "ব্যক্তিগত নোট",
  "landing.features.notes.body":
    "ছোট ছোট তথ্য মনে রাখুন — এমন নোট যা শুধু আপনি দেখতে পান।",
  "landing.how.title": "তিনটি ধাপ। একটি কম চিন্তা।",
  "landing.how.subtitle": "যোগ করুন, সেট করুন, ফেরত নিন।",
  "landing.how.step1.title": "ঋণ যোগ করুন",
  "landing.how.step1.body":
    "একজন বন্ধু, একটি পরিমাণ, একটি তারিখ। সব তথ্য এক নিরাপদ জায়গায়।",
  "landing.how.step2.title": "রিমাইন্ডার সেট করুন",
  "landing.how.step2.body":
    "চ্যানেল ও সময় বেছে নিন। বার্তা শ্রদ্ধাশীল রাখব আমরা।",
  "landing.how.step3.title": "ফেরত নিন",
  "landing.how.step3.body":
    "পরিশোধিত হিসেবে চিহ্নিত করুন, রিমাইন্ডার বন্ধ হবে, আপনি আপনার দিনে ফিরে যান।",
  "landing.final.title": "একটু বেশি শান্তি নিয়ে ধার দিন।",
  "landing.final.body":
    "ফেরতের তারিখ আমরা মনে রাখি, আপনাকে রাখতে হবে না।",
  "landing.footer": "© ২০২৬ লোন রিমাইন্ডার · গোপনীয়তা · শর্তাবলী · বাংলাদেশে তৈরি",
  "landing.mockup.totalLent": "মোট ধার",
  "landing.mockup.totalLentCaption": "৬টি ঋণ রেকর্ডকৃত",
  "landing.mockup.pending": "বকেয়া",
  "landing.mockup.pendingCaption": "২টি আসন্ন ঋণ",
  "landing.mockup.loan.due": "বকেয়া",
  "landing.mockup.note": "তানভীরের পরবর্তী রিমাইন্ডার ১২ অক্টোবর।",
  "landing.mockup.footnote":
    "আপনার টাকা, মনে রাখা। আপনার বন্ধুত্ব, সম্মানিত।", // uncertain

  // nav primitives
  "nav.aria.primary": "প্রধান",
  "nav.aria.main": "প্রধান নেভিগেশন",
  "nav.aria.brandHome": "লোন রিমাইন্ডার হোম",
  "nav.aria.avatar": (name) => `${name} এর অবতার`,

  // topbar primitives
  "topbar.aria.openMenu": "মেনু খুলুন",
  "topbar.aria.theme": "থিম পরিবর্তন",
  "topbar.aria.notifications": "বিজ্ঞপ্তি",
  "topbar.aria.notificationsUnread": (n) =>
    n === 1 ? "বিজ্ঞপ্তি, ১টি অপঠিত" : `বিজ্ঞপ্তি, ${n}টি অপঠিত`, // uncertain
  "topbar.aria.language": "ভাষা",
  "topbar.aria.profile": (name) => `${name} এর প্রোফাইল মেনু`,
  "topbar.aria.breadcrumb": "ব্রেডক্রাম্ব",
  "topbar.aria.accountTools": "অ্যাকাউন্ট টুলস", // uncertain
  "topbar.empty": "লোড হচ্ছে…",

  // forms / fields
  "form.searchFriend": "বন্ধু খুঁজুন",
  "form.searchFriends": "বন্ধু খুঁজুন",
  "form.searchReminders": "বন্ধুর নামে রিমাইন্ডার খুঁজুন",
  "form.searchLoans": "বন্ধুর নামে খুঁজুন…",
  "form.eyebrow": "রিমাইন্ডার পছন্দ",
  "form.eyebrow.new": "নতুন ঋণ",
  "form.eyebrow.edit": "ঋণ সম্পাদনা",
  "form.title.newLoan": "ঋণ যোগ করুন",
  "form.title.editLoan": "ঋণ সম্পাদনা",
  "form.subtitle.newLoan":
    "আপনি যা ধার দিয়েছেন, কবে বকেয়া, এবং কীভাবে মনে করাবেন — সব এখানে।",
  "form.subtitle.editLoan":
    "ঋণের বিবরণ আপডেট করুন। রিমাইন্ডার স্বয়ংক্রিয়ভাবে সামঞ্জস্য হবে।",
  "form.backToLoans": "ঋণের তালিকায় ফিরে যান",
  "form.smsTitle": "SMS রিমাইন্ডার",
  "form.smsSubtitle": "আপনার বন্ধুর ফোনে পাঠানো হবে।",
  "form.emailTitle": "ইমেইল রিমাইন্ডার",
  "form.emailSubtitle": "আপনার বন্ধুর ইনবক্সে পাঠানো হবে।",
  "form.toneLabel": "আপনি কেমন শোনাতে চান?",
  "form.toneAria": "রিমাইন্ডার টোন",
  "form.dueDateHelper": "একটি তারিখ বাছাই করুন",
  "form.amountHelper": "আপনি যে পরিমাণ ধার দিয়েছেন তা লিখুন।",
  "form.notePlaceholder":
    "কোর্স রেজিস্ট্রেশন ফি-তে সাহায্য করেছিলাম। রাফি আরেকটু সময় চেয়েছিল।",
  "form.messageLanguageHelper":
    "এই ঋণের জন্য ডিফল্ট বার্তার ভাষা বদলান।",
  "form.consentAria": "বন্ধুর সম্মতি",
  "form.amountNumber": "পরিমাণ",
  "form.optionalHelper": "শুধুমাত্র আপনি দেখতে পাবেন।",

  // dashboard
  "dashboard.aria.statusFilter": "ঋণের অবস্থা ফিল্টার",
  "dashboard.aria.addLoan": "নতুন ঋণ যোগ করুন",
  "dashboard.loadingAria": "সংরক্ষিত ঋণ লোড হচ্ছে…",
  "dashboard.goodDay": (name) => `শুভ দিন, ${name}`,

  // loans list
  "loans.newLoan": "নতুন ঋণ",
  "loans.menuAria": "ঋণের কার্যক্রম মেনু",
  "loans.actionRowAria": "ঋণের কার্যক্রম খুলুন",
  "loans.row.loanOverdue": (n) =>
    n === 1 ? "১টি ঋণ বিলম্বিত" : `${n}টি ঋণ বিলম্বিত`, // uncertain
  "loans.row.loanDue": (n) =>
    n === 1 ? "১টি ঋণ বকেয়া" : `${n}টি ঋণ বকেয়া`, // uncertain
  "loans.sort.aria": (dir) =>
    dir === "asc" ? "পুরনো আগে সাজান" : "নতুন আগে সাজান", // uncertain
  "loans.sort.label": "তারিখ",
  "loans.sort.oldest": "পুরনো আগে",
  "loans.sort.newest": "নতুন আগে",
  "loans.lastMonth": "গত মাস",
  "loans.thisMonth": "এই মাস",

  // loan details
  "loanDetails.aria.deletePayment": "পেমেন্ট মুছুন",
  "loanDetails.aria.progress": (paid) => `ঋণের অগ্রগতি, ${paid} পরিশোধিত`,
  "loanDetails.openMenu": "ঋণের কার্যক্রম খুলুন",
  "loanDetails.menu.aria": "ঋণের কার্যক্রম",
  "loanDetails.lastPaymentHelper": "সর্বশেষ পেমেন্ট",
  "loanDetails.paymentMethod": "মাধ্যম",
  "loanDetails.status.aria": (status) => `ঋণের অবস্থা: ${status}`,
  "loanDetails.amountRemaining": (remaining) => `${remaining} বকেয়া`,
  "loanDetails.deleted": "ঋণ মুছে ফেলা হয়েছে",
  "loanDetails.confirmReschedule": "ফেরতের তারিখ পুনঃনির্ধারণ করবেন?",
  "loanDetails.dueIn": (n) =>
    n === 1 ? "১ দিনের মধ্যে বকেয়া" : `${n} দিনের মধ্যে বকেয়া`, // uncertain
  "loanDetails.overdueBy": (n) =>
    n === 1 ? "১ দিন বিলম্বিত" : `${n} দিন বিলম্বিত`, // uncertain
  "loanDetails.dueToday": "আজ বকেয়া",
  "loanDetails.unknownFriend": "বন্ধু",
  "loanDetails.unknownDate": "—",

  // friends
  "friends.aria.search": "বন্ধু খুঁজুন",
  "friends.aria.open": "বন্ধুর পাতা খুলুন",
  "friends.empty": "এখনো কোনো বন্ধু নেই",
  "friends.loadingAria": "বন্ধুদের তালিকা লোড হচ্ছে…",
  "friends.loan": (n) => (n === 1 ? "১টি ঋণ" : `${n}টি ঋণ`), // uncertain
  "friends.open": "খুলুন",
  "friends.noLoans": "এখনো কোনো ঋণ নেই",
  "friends.total": "মোট",

  // notifications
  "notifications.aria.unread": "অপঠিত",
  "notifications.today": "আজ",
  "notifications.earlier": "আগে",
  "notifications.noUnread": "নতুন কোনো বিজ্ঞপ্তি নেই",
  "notifications.hasUnread": (n) =>
    n === 1 ? "১টি নতুন বিজ্ঞপ্তি" : `${n}টি নতুন বিজ্ঞপ্তি`, // uncertain
  "notifications.toast.markedAllRead": "সব বিজ্ঞপ্তি পঠিত হিসেবে চিহ্নিত।",
  "notifications.toast.deleted": "বিজ্ঞপ্তি মুছে ফেলা হয়েছে।",

  // reminders history
  "reminders.history.search.aria": "বন্ধুর নামে রিমাইন্ডার খুঁজুন",
  "reminders.history.sort.aria": (dir) =>
    dir === "asc" ? "পুরনো আগে সাজান" : "নতুন আগে সাজান", // uncertain
  "reminders.history.sort.date": "তারিখ",
  "reminders.history.sort.oldest": "পুরনো আগে",
  "reminders.history.sort.newest": "নতুন আগে",
  "reminders.history.channels.all": "সব",
  "reminders.history.channels.sms": "SMS",
  "reminders.history.channels.email": "ইমেইল",
  "reminders.history.status.all": "সব",
  "reminders.history.status.delivered": "পৌঁছেছে",
  "reminders.history.status.failed": "ব্যর্থ",
  "reminders.history.loanFallback": "ঋণ",
  "reminders.history.loadingAria": "রিমাইন্ডার ইতিহাস লোড হচ্ছে…",
  "reminders.history.aria.delete": "রিমাইন্ডার মুছুন",
  "reminders.history.subtitle":
    "আপনার হয়ে পাঠানো প্রতিটি রিমাইন্ডার এখানে দেখানো হবে।",
  "reminders.history.channelLabel": "মাধ্যম",
  "reminders.history.statusLabel": "অবস্থা",
  "reminders.history.table.friend": "বন্ধু",
  "reminders.history.table.amount": "পরিমাণ",
  "reminders.history.table.channel": "মাধ্যম",
  "reminders.history.table.sent": "পাঠানো হয়েছে",
  "reminders.history.table.status": "অবস্থা",
  "reminders.history.unknownLoan": "ঋণ",
  "reminders.history.filterLabel": "রিমাইন্ডার ফিল্টার",
  "reminders.history.searchPlaceholder": "বন্ধুর নামে খুঁজুন",

  // settings
  "settings.aria.themeGroup": "থিম",
  "settings.appearanceDesc":
    "লোন রিমাইন্ডার এই ডিভাইসে কেমন দেখাবে।",
  "settings.profileDesc":
    "আপনার নাম, ফোন ও ইমেইল শুধু এই ডিভাইসে সংরক্ষিত থাকে।",
  "settings.notificationsDesc":
    "কোন ঘটনাগুলোতে ইমেইল পেতে চান তা বেছে নিন।",
  "settings.securityDesc": "পাসওয়ার্ড পরিবর্তন করুন।",
  "settings.accountDesc": "অ্যাকাউন্ট ও সব ডেটা মুছে ফেলুন।",
  "settings.profileSavedToast": "প্রোফাইল আপডেট হয়েছে।",
  "settings.passwordMismatch": "পাসওয়ার্ড মিলছে না।",
  "settings.passwordTooShort": "অন্তত ৮টি অক্ষর ব্যবহার করুন।",
  "settings.passwordRequired": "আপনার বর্তমান পাসওয়ার্ড দিন।",
  "settings.passwordCurrentRequired": "আপনার বর্তমান পাসওয়ার্ড দিন।",
  "settings.deleteAccountTitle": "অ্যাকাউন্ট মুছবেন?",
  "settings.deleteAccountConfirm": "মুছুন",
  "settings.cancelDelete": "বাতিল",
  "settings.deleteWarning":
    "এটি আপনার অ্যাকাউন্ট এবং সব ডেটা স্থায়ীভাবে মুছে ফেলবে। এটি আর ফেরত আনা যাবে না।",
  "settings.namePlaceholder": "আপনার নাম",
  "settings.phonePlaceholder": "+৮৮০ ১XXXXXXXXX",
  "settings.emailPlaceholder": "you@example.com",
  "settings.theme.lightDesc": "উজ্জ্বল পৃষ্ঠ, গাঢ় লেখা।",
  "settings.theme.darkDesc": "গাঢ় পৃষ্ঠ, উজ্জ্বল লেখা।",
  "settings.theme.systemDesc": "সিস্টেমের থিম অনুসরণ করুন।",
  "settings.themeSystemHelper":
    "সিস্টেম যখন ডার্ক মোডে থাকে, লোন রিমাইন্ডারও ডার্ক হয়।",
  "settings.fieldRequired": "এই ক্ষেত্রটি পূরণ করা আবশ্যক।",
  "settings.fieldInvalid": "একটি বৈধ মান দিন।",
  "settings.saveAria": "পরিবর্তন সংরক্ষণ",
  "settings.themeOptionAria": (label) => `থিম: ${label}`,

  // reports
  "reports.range.label": "সময়সীমা",
  "reports.loadingAria": "রিপোর্ট লোড হচ্ছে…",
  "reports.emptyTitle": "এই সময়সীমায় কোনো ডেটা নেই",
  "reports.emptyBody":
    "ঋণ ও পেমেন্ট রেকর্ড করলে আপনার রিপোর্ট এখানে ভরে উঠবে।",
  "reports.aria.exportCsv": "CSV রপ্তানি",
  "reports.reliabilitySubtitle":
    "আপনার বন্ধুরা কেমন করে ফেরত দিচ্ছে।",
  "reports.openFriend": "বন্ধুর পাতা খুলুন",
  "reports.monthlyTable.title": "মাসভিত্তিক টেবিল",
  "reports.monthlyTable.empty": "দেখানোর জন্য কোনো ডেটা নেই।",
  "reports.status.heading": "ঋণের অবস্থা",
  "reports.upcoming.heading": "এই সপ্তাহে বকেয়া",
  "reports.noBorrowers": "এখনো কোনো ঋণগ্রহীতা নেই।",

  // payment modal
  "payment.subtitle": (remaining) => `${remaining} বকেয়া।`,
  "payment.amountHelper": "সর্বোচ্চ বকেয়া পরিমাণ।",
  "payment.cancel": "বাতিল",

  // reschedule modal
  "reschedule.cancel": "বাতিল",

  // terms / privacy
  "legal.untranslatedNotice":
    "এই পৃষ্ঠাটি এখনো শুধু ইংরেজিতে পাওয়া যায়",
  "legal.termsHeading": "সেবার শর্তাবলী",
  "legal.privacyHeading": "গোপনীয়তা",
  "legal.draftBadge": "খসড়া — পর্যালোচনা করুন।",
  "legal.draftBody":
    "এটি প্রাথমিক প্রকাশের খসড়া পাঠ। অ্যাপটি সবার জন্য উন্মুক্ত হওয়ার আগে একজন আইনি বিশেষজ্ঞ দিয়ে পর্যালোচনা করিয়ে নিন।",
  "legal.lastUpdated": "সর্বশেষ আপডেট",

  // loading / error / not-found
  "app.loading": "লোন রিমাইন্ডার লোড হচ্ছে…",
  "app.notFound.title": "পৃষ্ঠাটি পাওয়া যাচ্ছে না",
  "app.notFound.body":
    "আপনি যে পৃষ্ঠাটি খুঁজছেন তা সরানো, নাম বদলানো, বা কখনো ছিল না। ড্যাশবোর্ডে ফিরে যান।",
  "app.notFound.backToDashboard": "← ড্যাশবোর্ডে ফিরে যান",
  "app.error.title": "কিছু ভুল হয়েছে",
  "app.error.body":
    "আবার চেষ্টা করুন। সমস্যা থাকলে পৃষ্ঠাটি রিলোড করুন।",
  "app.error.retry": "আবার চেষ্টা করুন",

  // notifications (storage shape — translated at render time)
  "notif.paid.title": "ঋণ পরিশোধিত হিসেবে চিহ্নিত",
  "notif.paid.body": (amount) => `${amount} পরিশোধিত।`,
  "notif.overdue.title": "ঋণ বিলম্বিত",
  "notif.overdue.body": (name, amount, due) =>
    `${name} এর ${amount} ঋণ ${due} তারিখে বকেয়া ছিল। একটি বিনীত রিমাইন্ডার পাঠানো হয়েছে।`,
  "notif.reminderSent.title": "রিমাইন্ডার পাঠানো হয়েছে",
  "notif.reminderSent.body": (tone, channel) =>
    `${tone} ${channel} রিমাইন্ডার পৌঁছেছে।`,
  "notif.dueSoon.title": "ঋণ শিঘ্রই বকেয়া হবে",
  "notif.dueSoon.body": (name, due) =>
    `${name} এর ঋণ ${due} তারিখে বকেয়া হবে।`,
  "notif.loanCreated.title": "নতুন ঋণ রেকর্ডকৃত",
  "notif.loanCreated.body": (name, amount) =>
    `${name} কে ${amount} ধার দেওয়া হয়েছে।`,
  "notif.payment.title": "পেমেন্ট পাওয়া গেছে",
  "notif.payment.body": (name, amount, remaining) =>
    `${name} থেকে ${amount} পাওয়া গেছে। ${remaining} এখনো বকেয়া।`,
  "notif.paymentFully.title": "ঋণ সম্পূর্ণ পরিশোধিত",
  "notif.paymentFully.body": (name, amount) =>
    `${amount} রেকর্ড হয়েছে। ${name} এর ঋণ এখন সম্পূর্ণ মিটেছে।`,
  "notif.dueDateUpdated.title": "ফেরতের তারিখ আপডেট",
  "notif.dueDateUpdated.body": (name, from, to) =>
    `${name} এর ফেরতের তারিখ ${from} থেকে ${to} এ সরানো হয়েছে।`,

  // API error envelopes (B4) — message values returned by the
  // REST routes. The frontend maps `error.message` to these keys.
  "errors.api.unauthorized": "চালিয়ে যেতে সাইন ইন করুন।",
  "errors.api.forbidden": "এটিতে আপনার অ্যাক্সেস নেই।",
  "errors.api.not_found": "এটি খুঁজে পাওয়া যায়নি।",
  "errors.api.conflict": "এটি ইতিমধ্যে বিদ্যমান কোনো রেকর্ডের সাথে সংঘাত করছে।",
  "errors.api.rate_limited": "আপনি অনেক দ্রুত চেষ্টা করছেন — কিছুক্ষণ পর আবার চেষ্টা করুন।",
  "errors.api.server_error": "আমাদের পক্ষ থেকে কিছু সমস্যা হয়েছে। আবার চেষ্টা করুন।",
  "errors.api.invalid_json": "অনুরোধটি সঠিকভাবে তৈরি হয়নি।",
  "errors.api.validation_error": "কিছু ক্ষেত্রে সংশোধন দরকার।",
  "errors.api.unique_violation": "এই রেকর্ডটি ইতিমধ্যে বিদ্যমান।",
  "errors.api.loan_not_found": "এই ঋণটি বিদ্যমান নেই।",
  "errors.api.friend_not_found": "এই বন্ধুটি বিদ্যমান নেই।",
  "errors.api.payment_not_found": "এই পেমেন্টটি বিদ্যমান নেই।",
  "errors.api.amount_invalid": "একটি সঠিক পরিমাণ লিখুন।",
  "errors.api.amount_too_small": "পরিমাণ অবশ্যই ০ এর বেশি হতে হবে।",
  "errors.api.amount_too_large": "পরিমাণ অনেক বড়।",
  "errors.api.phone_invalid": "একটি সঠিক বাংলাদেশি মোবাইল নম্বর দিন।",
  "errors.api.given_date_invalid": "একটি সঠিক প্রদানের তারিখ লিখুন (YYYY-MM-DD)।",
  "errors.api.due_date_invalid": "একটি সঠিক ফেরতের তারিখ লিখুন (YYYY-MM-DD)।",
  "errors.api.due_before_given": "ফেরতের তারিখ অবশ্যই প্রদানের তারিখের সমান বা পরে হতে হবে।",
  "errors.api.due_not_after_today": "নতুন ফেরতের তারিখ অবশ্যই আজকের পরে হতে হবে।",
  "errors.api.due_date_unchanged": "নতুন ফেরতের তারিখ অবশ্যই বর্তমান তারিখ থেকে আলাদা হতে হবে।",
  "errors.api.consent_required": "বন্ধু রিমাইন্ডার পেতে রাজি আছেন — তা নিশ্চিত করুন।",
  "errors.api.no_channel_enabled": "অন্তত একটি রিমাইন্ডার চ্যানেল চালু করুন।",
  "errors.api.friend_opted_out": "এই বন্ধু রিমাইন্ডার থেকে অপ্ট-আউট করেছেন।",
  "errors.api.loan_already_paid": "এই ঋণ ইতিমধ্যে সম্পূর্ণ পরিশোধিত।",
  "errors.api.payment_overflow": "পেমেন্ট বকেয়া পরিমাণের বেশি হয়ে যাচ্ছে।",
  "errors.api.payment_date_future": "পেমেন্টের তারিখ ভবিষ্যতে হতে পারে না।",
  "errors.api.payment_date_before_given": "পেমেন্টের তারিখ ঋণ প্রদানের তারিখের আগে হতে পারে না।",
  "errors.api.restore_window_expired": "২৪ ঘণ্টার undo সময়সীমা শেষ হয়ে গেছে।",
  "errors.api.reminder_cooldown": "ইতিমধ্যে সম্প্রতি একটি রিমাইন্ডার পাঠানো হয়েছে। পরে আবার চেষ্টা করুন।",
  "errors.api.due_date_change_not_allowed": "ফেরতের তারিখ পরিবর্তন করতে reschedule ব্যবহার করুন।",
  "errors.api.method_invalid": "একটি সঠিক পেমেন্ট পদ্ধতি নির্বাচন করুন।",
  "errors.api.tone_invalid": "একটি সঠিক রিমাইন্ডার টোন নির্বাচন করুন।",
  "errors.api.language_invalid": "একটি সঠিক বার্তার ভাষা নির্বাচন করুন।",
  "errors.api.timing_invalid": "অন্তত একটি রিমাইন্ডার টাইমিং নির্বাচন করুন।",
  "errors.api.pagination_invalid": "পেজিনেশন মান সীমার বাইরে।",
  "errors.api.notification_not_found": "এই নোটিফিকেশনটি বিদ্যমান নেই।",
  "errors.api.empty_patch": "আপডেট করার জন্য কোনো ক্ষেত্র দেওয়া হয়নি।",
  "errors.api.template_too_long": "টেমপ্লেটটি তার চ্যানেলের সর্বোচ্চ দৈর্ঘ্য ছাড়িয়ে গেছে।",
  "errors.api.unknown_placeholder": "টেমপ্লেটে একটি অজানা placeholder ব্যবহার করা হয়েছে।",

  // status labels
  "status.paid": "পরিশোধিত",
  "status.pending": "বকেয়া",
  "status.overdue": "বিলম্বিত",

  // misc small UI strings (audit phase 2)
  "ui.searchFriends": "বন্ধু খুঁজুন",
  "ui.searchFriends.aria": "বন্ধুদের খুঁজুন",
  "ui.searchReminders.aria": "বন্ধুর নামে রিমাইন্ডার খুঁজুন",
  "ui.searchLoansPlaceholder": "ঋণ খুঁজুন…",
  "ui.searchFriendPlaceholder": "বন্ধু খুঁজুন",
  "ui.namePlaceholder": "আয়েশা রহমান",
  "ui.phonePlaceholder": "১৭১২ ৩৪৫৬৭৮",
  "ui.emailPlaceholder": "you@example.com",
  "ui.friendNamePlaceholder": "যেমন রাফি",
  "ui.amountPlaceholder": "৫,০০০",
  "ui.pickADate": "একটি তারিখ বাছাই করুন",
  "ui.loading": "লোড হচ্ছে…",
  "ui.loadingFriends": "বন্ধুদের তালিকা লোড হচ্ছে…",
  "ui.loadingFriend": "বন্ধু লোড হচ্ছে…",
  "ui.loadingLoans": "সংরক্ষিত ঋণ লোড হচ্ছে…",
  "ui.loadingSettings": "সংরক্ষিত সেটিংস লোড হচ্ছে…",
  "ui.loadingNotifications": "বিজ্ঞপ্তি লোড হচ্ছে…",
  "ui.loadingReports": "রিপোর্ট লোড হচ্ছে…",
  "ui.loadingReminders": "রিমাইন্ডারের ইতিহাস লোড হচ্ছে…",
  "ui.copy": "কপি",
  "ui.noMatch": "এই অনুসন্ধানে কোনো বন্ধু মেলেনি।",
  "ui.noRemindersMatch": "এই ফিল্টারে কোনো রিমাইন্ডার মেলেনি।",
  "ui.noUnreadNotifications": "কোনো অপঠিত বিজ্ঞপ্তি নেই।",
  "ui.allCaughtUpTitle": "সব কিছু হালনাগাদ",
  "ui.allCaughtUpBody":
    "আপনার ঋণ সংক্রান্ত গুরুত্বপূর্ণ কিছু ঘটলে আমরা জানাবো।",
  "ui.backToDashboard": "ড্যাশবোর্ডে ফিরুন",
  "ui.backToFriends": "বন্ধুদের তালিকায় ফিরুন",
  "ui.backToLoans": "ঋণের তালিকায় ফিরুন",
  "ui.backToReminderSettings": "রিমাইন্ডার সেটিংসে ফিরুন",
  "ui.loanSaved": "ঋণ সংরক্ষিত হয়েছে। রিমাইন্ডার নির্ধারিত।",
  "ui.loanSaveFailed": "ঋণ সংরক্ষণ করা যায়নি। আবার চেষ্টা করুন।",
  "ui.friendShortcutCopied": "বন্ধুর শর্টকাট কপি হয়েছে",
  "ui.notFound": "পাওয়া যায়নি",
  "ui.cantFindFriendTitle": "আমরা ওই বন্ধুকে খুঁজে পাচ্ছি না",
  "ui.cantFindFriendBody":
    "বন্ধুকে হয়তো মুছে ফেলা হয়েছে, অথবা লিংকটি ভুল।",
  "ui.phoneNotOnFile": "ফোন নম্বর সংরক্ষিত নেই",
  "ui.loanNotFound": "ঋণ পাওয়া যায়নি",
  "ui.loanNotFoundBody":
    "এই ঋণ হয়তো মুছে ফেলা হয়েছে, অথবা লিংকটি ভুল।",
  "ui.addANewLoan": "নতুন ঋণ যোগ করুন",
  "ui.saving": "সংরক্ষণ হচ্ছে…",
  "ui.deleting": "মুছে ফেলা হচ্ছে…",
  "ui.loggingIn": "লগ ইন হচ্ছে…",
  "ui.savingProfile": "সংরক্ষণ হচ্ছে…",
  "ui.savingPassword": "সংরক্ষণ হচ্ছে…",
  "ui.passwordChanged": "পাসওয়ার্ড পরিবর্তিত হয়েছে",
  "ui.accountDeleted": "অ্যাকাউন্ট মুছে ফেলা হয়েছে",
  "ui.profileUpdated": "প্রোফাইল হালনাগাদ হয়েছে",
  "ui.settingsSaved": "সেটিংস সংরক্ষিত।",
  "ui.sortOldest": "পুরোনো",
  "ui.sortNewest": "নতুন",
  "ui.sortOldestFirst": "পুরোনো আগে",
  "ui.sortNewestFirst": "নতুন আগে",
  "ui.sortDate": "তারিখ",
  "ui.sortAria": (dir) =>
    dir === "asc" ? "পুরোনো আগে সাজান" : "নতুন আগে সাজান", // uncertain
  "ui.unknown": "অজানা",
  "ui.unknownFriend": "অজানা বন্ধু",
  "ui.toneFriendly": "বন্ধুসুলভ",
  "ui.toneNeutral": "নিরপেক্ষ",
  "ui.toneFirm": "একগুঁয়ে",
  "ui.toneAria": "রিমাইন্ডারের ভাষারীতি",
  "ui.messageLanguage": "বার্তার ভাষা",
  "ui.messageLanguageAria": "বার্তার ভাষা",
  "ui.messageLanguageUseDefault": "ডিফল্ট ব্যবহার করুন",
  "ui.messageLanguageDefaultHelp":
    "নতুন ঋণের জন্য রিমাইন্ডারে নির্ধারিত ভাষাই ডিফল্ট হিসেবে ধরা হবে।",
  "ui.emailOptionalHelper":
    "ইমেইল রিমাইন্ডার চালু করলে ইমেইল যোগ করতে পারবেন।",
  "ui.remindersStop":
    "ঋণ পরিশোধিত হিসেবে চিহ্নিত করলে রিমাইন্ডার স্বয়ংক্রিয়ভাবে বন্ধ হয়।",
  "ui.consentLabel":
    "আমার বন্ধু জানেন যে তাঁর কাছে রিমাইন্ডার যেতে পারে।",
  "ui.consentAria": "বন্ধুর সম্মতি",
  "ui.termsIntro": ({ terms, privacy }) =>
    `এই ঋণ সংরক্ষণ করার মাধ্যমে আপনি আমাদের ${terms} ও ${privacy} মেনে নিচ্ছেন।`,
  "ui.reportRangeAria": "রিপোর্টের সময়সীমা",
  "ui.reportRangeExport": "CSV রপ্তানি",
  "ui.reportRangeAll": "সব সময়",
  "ui.reportRange3m": "গত ৩ মাস",
  "ui.reportRange6m": "গত ৬ মাস",
  "ui.reportRange12m": "গত ১২ মাস",
  "ui.reportsLoansCount": (n) =>
    n === 1 ? "১টি ঋণ" : `${n}টি ঋণ`, // uncertain
  "ui.reportsPaidCount": (n) =>
    n === 1 ? "১টি পরিশোধিত" : `${n}টি পরিশোধিত`, // uncertain
  "ui.reportsStatusAllSettled": "সব পরিশোধিত",
  "ui.reportsStatusOutstanding": "বকেয়া",
  "ui.reportsStatusExcellent": "চমৎকার!",
  "ui.reportsStatusGood": "ভালো",
  "ui.reportsStatusImprove": "আরও ভালো হতে পারে",
  "ui.reportsAvgRepayNone": "এখনো কোনো ঋণ পরিশোধিত হয়নি।",
  "ui.legend.lent": "ধার",
  "ui.legend.received": "ফেরত",
  "ui.reportsChartAria": "মাসভিত্তিক ধার ও ফেরতের বার চার্ট",
  "ui.reportsChartTooltipLent": (label, money) =>
    `${label} · ধার: ${money}`,
  "ui.reportsChartTooltipReceived": (label, money) =>
    `${label} · ফেরত: ${money}`,
  "ui.statusCounts": (n, label) => `${n}${label}`,
  "ui.statusLoansUnit": "টি ঋণ",
  "ui.reportsAvgRepayOnTime": "আপনার বন্ধুরা সময়মতো ফেরত দিচ্ছেন।",
  "ui.reportsAvgRepayLate": "গড়ে এই সময় পরে ফেরত আসছে।",
  "ui.upcomingToday": "আজ",
  "ui.upcomingTomorrow": "আগামীকাল",
  "ui.upcomingInDays": (n) => `${n} দিনে`,
  "ui.upcomingInOneDay": "১ দিনে",
  "ui.loansCountSingular": (n) => `${n}টি ঋণ`,
  "ui.loansCountCaption": (n) => `${n}টি ঋণ`,
  "ui.dashboardGreetingPrefix": (greeting) => `${greeting}, আয়েশা`,
  "ui.timelineLoanGiven": (amount, name, when) =>
    `${name}-কে ৳${amount} ধার দেওয়া হয়েছে ${when}-এ`,
  "ui.timelinePayment": (amount, when) =>
    `৳${amount} ফেরত পাওয়া গেছে ${when}-এ`,
  "ui.timelineReschedule": (from, to) =>
    `ফেরতের তারিখ ${from} থেকে ${to}-এ সরিয়ে নেওয়া হয়েছে`,
  "ui.timelineReminderScheduled": "রিমাইন্ডার নির্ধারিত",
  "ui.timelineReminderDescription": (channels) =>
    (channels as string[]).join(" · "),
  "ui.timelinePaidOn": (when) => `${when}-এ পরিশোধিত হিসেবে চিহ্নিত`,
  "ui.timelineUpcoming": (when) => `ফেরত দেওয়ার তারিখ ${when}`,
  "ui.smsAndEmail": "SMS ও ইমেইল",
  "ui.sms": "SMS",
  "ui.email": "ইমেইল",
  "ui.paymentMethod.cash": "নগদ",
  "ui.paymentMethod.bkash": "বিকাশ",
  "ui.paymentMethod.nagad": "নগদ (Nagad)",
  "ui.paymentMethod.bank": "ব্যাংক",
  "ui.paymentMethod.other": "অন্যান্য",
  "ui.methodChipAria": (label) => `পেমেন্টের মাধ্যম: ${label}`,
  "ui.methodChip.bkash": "বিকাশ",
  "ui.methodChip.nagad": "নগদ (Nagad)",
  "ui.methodChip.bank": "ব্যাংক",
  "ui.methodChip.cash": "নগদ",
  "ui.methodChip.other": "অন্যান্য",
  "ui.smsPreviewLabel": (tone) =>
    tone === "Friendly"
      ? "লাইভ প্রিভিউ · বন্ধুসুলভ"
      : `SMS প্রিভিউ · ${tone === "Neutral" ? "নিরপেক্ষ" : "একগুঁয়ে"}`,
  "ui.emailPreviewLabel": (tone) =>
    tone === "Friendly"
      ? "লাইভ প্রিভিউ · বন্ধুসুলভ"
      : `ইমেইল প্রিভিউ · ${tone === "Neutral" ? "নিরপেক্ষ" : "একগুঁয়ে"}`,
  "ui.previewFriend": "তানভীর",
  "ui.previewAmount": "৳১২,৫০০",
  "ui.previewDueDate": "১৫ অক্টো ২০২৬",
  "ui.previewMyName": "আয়েশা",
  "ui.previewEmail": "tanvir.hasan@gmail.com",
  "ui.previewSendDate": "১২ অক্টো ২০২৬ · সকাল ১০:০০",
  "ui.previewByline": (name) => `${name}-এর পক্ষে লোন রিমাইন্ডার`,
  "ui.previewTo": (email) => `প্রতি: ${email}`,
  "ui.previewFooter": (name) =>
    `${name}-এর পাঠানো একটি ব্যক্তিগত রিমাইন্ডার। আপনি সরাসরি এই ইমেইলে উত্তর দিতে পারেন।`,
  "ui.previewTextMessage": "টেক্সট মেসেজ",
  "ui.previewFriendAmount": (friend, amount) =>
    `${friend}-এর ${amount} ঋণের প্রিভিউ।`,
  "ui.previewFriendDue": (friend, amount, due) =>
    `${friend} · ${amount} · ফেরত ${due}`,
  "ui.reminders.smsChars": (chars, segs, max) =>
    `${chars} অক্ষর · ${segs}টি সেগমেন্ট (${max}/সেগমেন্ট)`,
  "ui.reminders.smsUnicodeNote":
    " · বাংলা SMS-এ ৭০ অক্ষরের সেগমেন্ট ব্যবহৃত হয়",
  "ui.reminders.toneTitle.friendly": "ভাবুন রিমাইন্ডার",
  "ui.reminders.toneTitle.neutral": "নিরপেক্ষ, তবে শ্রদ্ধাশীল।",
  "ui.reminders.toneTitle.firm": "একগুঁয়ে, তবে শ্রদ্ধাশীল।",
  "ui.reminders.toneSub.friendly":
    "আপনার নিজের ভাষায় একটি মৃদু স্মরণীকা। সঠিক শব্দগুলো বেছে নিন।",
  "ui.reminders.toneSub.neutral":
    "রিমাইন্ডার সেটিংস · ভাষারীতির অবস্থা ও প্রিভিউ",
  "ui.reminders.toneSub.firm":
    "রিমাইন্ডার সেটিংস · ভাষারীতির অবস্থা ও প্রিভিউ",
  "ui.reminders.toneDesc.friendly":
    "উষ্ণ ও বোধগম্য, আলোচনার সুযোগ রাখে।",
  "ui.reminders.toneDesc.neutral": "সরল ও বিবেচক।",
  "ui.reminders.toneDesc.firm": "সরাসরি, তবে সম্পর্কের দরজা খোলা রাখে।",
  "ui.reminders.defaultsTitle": "ডিফল্ট রিমাইন্ডার পছন্দ",
  "ui.reminders.defaultsSub":
    "নতুন ঋণে প্রযোজ্য। প্রতিটি বন্ধুর জন্য আলাদা মানিয়ে নেওয়া যায়।",
  "ui.reminders.smsLabel": "SMS",
  "ui.reminders.smsSub": "ফোনে রিমাইন্ডার",
  "ui.reminders.emailLabel": "ইমেইল",
  "ui.reminders.emailSub": "ইনবক্সে রিমাইন্ডার",
  "ui.reminders.threeDaysBefore": "৩ দিন আগে",
  "ui.reminders.onDueDate": "ফেরতের দিন",
  "ui.reminders.everyTwoDaysOverdue": "বিলম্বের পর প্রতি ২ দিন",
  "ui.reminders.noteFootnote":
    "রিমাইন্ডার প্রতিদিন বাংলাদেশ সময় সকাল ১০টায় পাঠানো হয় এবং ঋণ পরিশোধিত হলে বন্ধ হয়ে যায়।",
  "ui.reminders.historyLink": "রিমাইন্ডার ইতিহাস দেখুন",
  "ui.reminders.smsHeader": "SMS টেমপ্লেট",
  "ui.reminders.emailHeader": "ইমেইল টেমপ্লেট",
  "ui.reminders.subjectLabel": "বিষয়",
  "ui.reminders.messageLabel": "বার্তা",
  "ui.reminders.placeholdersHelper":
    "এই ট্যাগগুলো স্বয়ংক্রিয়ভাবে পূরণ হবে:",
  "ui.reminders.emailRepliesHelper":
    "আপনার পক্ষে পাঠানো হবে। উত্তর সরাসরি আপনার ইমেইলে আসবে।",
  "ui.reminders.alwaysPolite":
    "সবসময় ভদ্র। সবসময় আপনার পক্ষে।",
  "ui.reminders.saveChanges": "পরিবর্তন সংরক্ষণ",
  "ui.reminders.messageTone": "বার্তার ভাষারীতি",
  "ui.reminders.savedToast": "সেটিংস সংরক্ষিত।",
  "ui.reminders.unicodeNote":
    "বাংলা SMS-এ ৭০ অক্ষরের সেগমেন্ট ব্যবহৃত হয়।",
  "ui.reminders.tagsHelp":
    "নতুন ঋণের জন্য রিমাইন্ডারে নির্ধারিত ভাষাই ডিফল্ট।",
  "ui.loanDetails.notFound": "ঋণ পাওয়া যায়নি",
  "ui.loanDetails.notFoundBody":
    "এই ঋণ হয়তো মুছে ফেলা হয়েছে, অথবা লিংকটি ভুল।",
  "ui.friends.title": "আপনার বন্ধুরা",
  "ui.friends.subtitle": "আপনি যাঁদের ধার দিয়েছেন, এক জায়গায়।",
  "ui.friends.table.friend": "বন্ধু",
  "ui.friends.table.loans": "ঋণ",
  "ui.friends.table.totalLent": "মোট ধার",
  "ui.friends.table.outstanding": "বকেয়া",
  "ui.friends.table.status": "অবস্থা",
  "ui.friends.newLoan": "নতুন ঋণ",
  "ui.friends.mobileSub": (count, total) =>
    `${count}টি ঋণ · মোট ${total}`,
  "ui.friends.detail.subtitle": (name) =>
    `${name}-এর ঋণ, রিমাইন্ডার ও যোগাযোগের তথ্য।`,
  "ui.friends.detail.noLoans": (name) =>
    `${name}-এর জন্য এখনো কোনো ঋণ নেই।`,
  "ui.friends.detail.summary.totalLent": "মোট ধার",
  "ui.friends.detail.summary.totalReceived": "মোট ফেরত",
  "ui.friends.detail.summary.outstanding": "বকেয়া",
  "ui.friends.detail.summary.paidBack": "ফেরত পেয়েছেন",
  "ui.friends.detail.summary.nothingRepaid": "এখনো কিছু ফেরত আসেনি",
  "ui.friends.detail.summary.includesOverdue": "বিলম্বিত অন্তর্ভুক্ত",
  "ui.friends.detail.summary.awaiting": "ফেরতের অপেক্ষায়",
  "ui.friends.detail.summary.allSettled": "সব মিটে গেছে",
  "ui.friends.detail.loansHeading": "ঋণসমূহ",
  "ui.friends.detail.reminderHistoryHeading": "রিমাইন্ডারের ইতিহাস",
  "ui.friends.detail.viewAll": "সব দেখুন",
  "ui.friends.detail.noReminders": "এখনো কোনো রিমাইন্ডার পাঠানো হয়নি।",
  "ui.friends.detail.smsReminder": "SMS রিমাইন্ডার",
  "ui.friends.detail.emailReminder": "ইমেইল রিমাইন্ডার",
  "ui.friends.detail.dueLabel": (when) => `ফেরত: ${when}`,
  "ui.friends.detail.overdueByOne": "১ দিন বিলম্বিত",
  "ui.friends.detail.overdueBy": (n) =>
    n === 1 ? "১ দিন বিলম্বিত" : `${n} দিন বিলম্বিত`, // uncertain
  "ui.friends.firstLoan":
    "এখনো কোনো বন্ধু নেই — আপনার প্রথম ঋণ আপনার প্রথম বন্ধু তৈরি করবে।",
  "ui.notifications.title": "বিজ্ঞপ্তি",
  "ui.notifications.subtitle": "আপনার ঋণ সম্পর্কে শান্ত আপডেট।",
  "ui.notifications.markAll": "সব পঠিত হিসেবে চিহ্নিত করুন",
  "ui.notifications.all": "সব",
  "ui.notifications.unread": "অপঠিত",
  "ui.notifications.unreadDot": "অপঠিত",
  "ui.notifications.empty.title": "সব কিছু হালনাগাদ",
  "ui.notifications.empty.body":
    "আপনার ঋণ সংক্রান্ত গুরুত্বপূর্ণ কিছু ঘটলে আমরা জানাবো।",
  "ui.reports.title": "রিপোর্ট",
  "ui.reports.subtitle":
    "এক নজরে — কত ধার দিয়েছেন, কত ফেরত পেয়েছেন, কত বকেয়া।",
  "ui.reports.empty.title": "এই সময়সীমায় কোনো তথ্য নেই",
  "ui.reports.empty.body":
    "রিপোর্ট দেখতে ঋণ ও পেমেন্ট যোগ করুন।",
  "ui.reports.lentVsReceived": "ধার বনাম ফেরত",
  "ui.reports.lentVsReceivedTable": "মাসভিত্তিক ধার ও ফেরতের ছক",
  "ui.reports.month": "মাস",
  "ui.reports.lent": "ধার",
  "ui.reports.received": "ফেরত",
  "ui.reports.statusBreakdown": "অবস্থার ভাঙন",
  "ui.reports.topBorrowers": "শীর্ষ ঋণগ্রহীতা",
  "ui.reports.reliability": "বন্ধুদের নির্ভরযোগ্যতা",
  "ui.reports.upcoming": "এই সপ্তাহে বকেয়া",
  "ui.reports.upcomingEmpty": "পরবর্তী ৭ দিনে কিছু বকেয়া নেই।",
  "ui.reports.avgRepayTime": (d) =>
    d === 1
      ? "গড়ে ১ দিনে ফেরত"
      : `গড়ে ${d} দিনে ফেরত`,
  "ui.reports.legend.lent": "ধার",
  "ui.reports.legend.received": "ফেরত",
  "ui.reports.chartAria": "মাসভিত্তিক ধার বনাম ফেরতের বার চার্ট",
  "ui.reports.status.paid": "পরিশোধিত",
  "ui.reports.status.pending": "বকেয়া",
  "ui.reports.status.overdue": "বিলম্বিত",
  "ui.reports.reliability.always": "সবসময় সময়মতো",
  "ui.reports.reliability.sometimes": "মাঝে মাঝে বিলম্ব",
  "ui.reports.reliability.often": "প্রায়ই বিলম্ব",
  "ui.reports.statusCounts": (n) => `${n}টি ঋণ`,
  "ui.settings.eyebrow": "আপনার অ্যাকাউন্ট, আপনার ইচ্ছামতো",
  "ui.settings.title": "সেটিংস",
  "ui.settings.subtitle":
    "প্রোফাইল, পছন্দ, বিজ্ঞপ্তি ও নিরাপত্তা পরিচালনা করুন।",
  "ui.settings.profile.title": "প্রোফাইল",
  "ui.settings.appearance.title": "চেহারা",
  "ui.settings.appearanceDesc": "এই ডিভাইসে লোন রিমাইন্ডার কেমন দেখাবে।",
  "ui.settings.notifications.title": "বিজ্ঞপ্তি",
  "ui.settings.notificationsDesc": "আপনার অ্যাকাউন্টে ইমেইল রিমাইন্ডার।",
  "ui.settings.security.title": "নিরাপত্তা",
  "ui.settings.securityDesc": "অন্য কোথাও ব্যবহার করেন না এমন পাসওয়ার্ড বাছাই করুন।",
  "ui.settings.account.title": "অ্যাকাউন্ট",
  "ui.settings.accountDesc": "লগ আউট করুন বা অ্যাকাউন্ট স্থায়ীভাবে মুছে ফেলুন।",
  "ui.settings.profile.name": "পূর্ণ নাম",
  "ui.settings.profile.phone": "ফোন",
  "ui.settings.profile.email": "ইমেইল",
  "ui.settings.profile.emailType": "email",
  "ui.settings.security.currentPassword": "বর্তমান পাসওয়ার্ড",
  "ui.settings.security.newPassword": "নতুন পাসওয়ার্ড",
  "ui.settings.security.confirmPassword": "নতুন পাসওয়ার্ড নিশ্চিত করুন",
  "ui.settings.security.helper": "অন্তত ৮ অক্ষর ব্যবহার করুন।",
  "ui.settings.security.save": "পাসওয়ার্ড সংরক্ষণ",
  "ui.settings.theme.title": "থিম",
  "ui.settings.theme.label": "থিম",
  "ui.settings.theme.light": "হালকা",
  "ui.settings.theme.dark": "গাঢ়",
  "ui.settings.theme.system": "সিস্টেম",
  "ui.settings.theme.systemHelper":
    "সিস্টেম বেছে নিলে অপারেটিং সিস্টেমের সাথে মিল রাখা হবে।",
  "ui.settings.language.title": "ভাষা",
  "ui.settings.language.label": "ভাষা",
  "ui.settings.language.helper":
    "পুরো অ্যাপে প্রযোজ্য। রিমাইন্ডার বার্তার নিজস্ব ভাষা সেটিং রিমাইন্ডার পাতায় রয়েছে।",
  "ui.settings.banglaNumerals.title": "বাংলা সংখ্যা ব্যবহার করুন",
  "ui.settings.banglaNumerals.helper":
    "০-৯ এর বদলে ০-৯ ব্যবহার করে পরিমাণ ও তারিখ দেখান।", // uncertain — clarify
  "ui.settings.openReports": "রিপোর্ট খুলুন",
  "ui.settings.profileSaved": "প্রোফাইল হালনাগাদ হয়েছে",
  "ui.settings.passwordChanged": "পাসওয়ার্ড পরিবর্তিত হয়েছে",
  "ui.settings.accountDeleted": "অ্যাকাউন্ট মুছে ফেলা হয়েছে",
  "ui.settings.signOut": "এই ডিভাইস থেকে লগ আউট করুন।",
  "ui.settings.logOut": "লগ আউট",
  "ui.settings.deleteAccount.title": "অ্যাকাউন্ট মুছে ফেলুন",
  "ui.settings.deleteAccount.helper":
    "আপনার অ্যাকাউন্ট ও সব ঋণের রেকর্ড স্থায়ীভাবে মুছে ফেলুন।",
  "ui.settings.deleteAccount.confirm.title": "অ্যাকাউন্ট মুছে ফেলবেন?",
  "ui.settings.deleteAccount.confirm.body":
    "আপনার অ্যাকাউন্ট, প্রতিটি ঋণের রেকর্ড ও রিমাইন্ডারের ইতিহাস স্থায়ীভাবে মুছে যাবে। এটা আর ফেরানো যাবে না।",
  "ui.settings.deleteAccount.confirm.delete": "অ্যাকাউন্ট মুছে ফেলুন",
  "ui.settings.deleteAccount.confirm.keep": "অ্যাকাউন্ট রাখুন",
  "ui.settings.deleteAccount.confirm.deleting": "মুছে ফেলা হচ্ছে…",
  "ui.settings.toggles.emailOnPaid.title":
    "ঋণ পরিশোধিত হলে আমাকে ইমেইল করুন",
  "ui.settings.toggles.emailOnPaid.sub":
    "আমরা একটি শান্ত নিশ্চিতকরণ বার্তা পাঠাবো।",
  "ui.settings.toggles.emailOnOverdue.title":
    "ঋণ বিলম্বিত হলে আমাকে ইমেইল করুন",
  "ui.settings.toggles.emailOnOverdue.sub":
    "ফেরতের তারিখ পার হলে আমরা জানাবো।",
  "ui.settings.toggles.weeklySummary.title": "সাপ্তাহিক সারাংশ",
  "ui.settings.toggles.weeklySummary.sub":
    "প্রতি রবিবার আপনার ধার-সংক্রান্ত সংক্ষিপ্ত সারাংশ।",
  "ui.settings.saveChanges": "পরিবর্তন সংরক্ষণ",
  "ui.settings.yourName": "আপনার নাম",
  "ui.settings.saving": "সংরক্ষণ হচ্ছে…",
  "ui.settings.profile.fullName": "পূর্ণ নাম",
  "ui.loansList.addLoan": "নতুন ঋণ",
  "ui.loansList.count": (n) => `${n}টি ঋণ`,
  "ui.loansList.searchPlaceholder": "ঋণ খুঁজুন",
  "ui.loansList.table.friend": "বন্ধু",
  "ui.loansList.table.amount": "পরিমাণ",
  "ui.loansList.table.dateGiven": "ধার দেওয়ার তারিখ",
  "ui.loansList.table.dueDate": "ফেরতের তারিখ",
  "ui.loansList.table.status": "অবস্থা",
  "ui.loansList.status.aria": "ঋণের অবস্থা ফিল্টার",
  "ui.loansList.chip.all": "সব",
  "ui.loansList.chip.pending": "বকেয়া",
  "ui.loansList.chip.overdue": "বিলম্বিত",
  "ui.loansList.chip.paid": "পরিশোধিত",
  "ui.loansList.menu.view": "দেখুন",
  "ui.loansList.menu.edit": "সম্পাদনা",
  "ui.loansList.menu.markPaid": "পরিশোধিত হিসেবে চিহ্নিত করুন",
  "ui.loansList.menu.delete": "মুছে ফেলুন",
  "ui.loansList.menuAria": "ঋণের কর্ম মেনু খুলুন",
  "ui.dashboard.eyebrow": (when) => String(when ?? ""),
  "ui.dashboard.recent": "সাম্প্রতিক ঋণ",
  "ui.dashboard.seeAll": "সব দেখুন",
  "ui.dashboard.paidOn": (when) => `${when}-এ পরিশোধিত`,
  "ui.dashboard.empty": "এখানে এখনো কিছু নেই।",
  "ui.dashboard.addLoan": "নতুন ঋণ",
  "ui.dashboard.addLoan.aria": "নতুন ঋণ যোগ করুন",
  "ui.dashboard.totalLent": "মোট ধার",
  "ui.dashboard.totalReceived": "মোট ফেরত",
  "ui.dashboard.pending": "বকেয়া",
  "ui.dashboard.overdue": "বিলম্বিত",
  "ui.dashboard.activeLoans": (n) =>
    n === 1 ? "১টি সক্রিয় ঋণ" : `${n}টি সক্রিয় ঋণ`,
  "ui.dashboard.paidBack": (n) =>
    n === 1 ? "১টি ফেরত পাওয়া গেছে" : `${n}টি ফেরত পাওয়া গেছে`,
  "ui.dashboard.awaiting": (n) =>
    n === 1 ? "১টি অপেক্ষমাণ" : `${n}টি অপেক্ষমাণ`,
  "ui.dashboard.pastDue": (n) =>
    n === 1 ? "১টি বিলম্বিত" : `${n}টি বিলম্বিত`,
  "ui.dashboard.overdueNotice": (n) =>
    n === 1
      ? "১টি ঋণ বিলম্বিত। একটি মৃদু রিমাইন্ডার পাঠানো হচ্ছে।"
      : `${n}টি ঋণ বিলম্বিত। মৃদু রিমাইন্ডার পাঠানো হচ্ছে।`,
  "ui.dashboard.reports": "রিপোর্ট",
  "ui.loansList.rescheduled": "পুনঃনির্ধারিত",
  "ui.loansList.partial": (paid, total) => `৳${paid} পরিশোধিত · মোট ৳${total}`,
  "ui.loansList.partialOnly": (paid) => `৳${paid} পরিশোধিত`,
  "ui.loansList.partialRemaining": (total) => `মোট ৳${total}`,
  "ui.loansList.overdueBy": (n) =>
    n === 1 ? "১ দিন বিলম্বিত" : `${n} দিন বিলম্বিত`,
  "ui.loansList.dueIn": (n) =>
    n === 1 ? "১ দিনের মধ্যে ফেরত" : `${n} দিনের মধ্যে ফেরত`,
  "ui.loanDetails.recordPayment": "পেমেন্ট রেকর্ড করুন",
  "ui.loanDetails.markFullyPaid": "সম্পূর্ণ পরিশোধিত চিহ্নিত করুন",
  "ui.loanDetails.reschedule": "পুনঃনির্ধারণ",
  "ui.loanDetails.sendReminder": "এখনই রিমাইন্ডার পাঠান",
  "ui.loanDetails.edit": "সম্পাদনা",
  "ui.loanDetails.delete": "মুছে ফেলুন",
  "ui.loanDetails.dueDateLabel": "ফেরতের তারিখ",
  "ui.loanDetails.givenDateLabel": "ধার দেওয়ার তারিখ",
  "ui.loanDetails.backToLoans": "ঋণের তালিকায় ফিরুন",
  "ui.loanDetails.toast.markedPaid": "ঋণ পরিশোধিত হিসেবে চিহ্নিত।",
  "ui.loanDetails.toast.paymentRecorded": "পেমেন্ট রেকর্ড হয়েছে।",
  "ui.loanDetails.toast.paymentDeleted": "পেমেন্ট মুছে ফেলা হয়েছে।",
  "ui.loanDetails.toast.dueDateUpdated": "ফেরতের তারিখ হালনাগাদ।",
  "ui.loanDetails.toast.loanDeleted": "ঋণ মুছে ফেলা হয়েছে।",
  "ui.loanDetails.toast.reminderSent": "রিমাইন্ডার পাঠানো হয়েছে।",
  "ui.loanDetails.privateNotes": "ব্যক্তিগত নোট",
  "ui.loanDetails.reminderScheduled": "রিমাইন্ডার নির্ধারিত",
  "ui.loanDetails.paymentHistory": "পেমেন্টের ইতিহাস",
  "ui.loanDetails.paymentHistoryEmpty":
    "এখনো কোনো পেমেন্ট রেকর্ড হয়নি। উপরে “পেমেন্ট রেকর্ড করুন” বোতাম চাপুন।",
  "ui.loanDetails.rescheduleHistory": "ফেরতের তারিখের পরিবর্তন",
  "ui.loanDetails.timeline": "টাইমলাইন",
  "ui.loanDetails.paid": (amount) => `${amount} পরিশোধিত`,
  "ui.loanDetails.remaining": (amount) => `${amount} বকেয়া`,
  "ui.loanDetails.deletePaymentTitle": "এই পেমেন্ট মুছে ফেলবেন?",
  "ui.loanDetails.deletePaymentBody": (amount) =>
    `${amount} পেমেন্টটি মুছে দিলে ঋণের বকেয়া হিসাব পরিবর্তন হবে।`,
  "ui.loanDetails.deleteTitle": (name) => `${name}-এর ঋণ মুছে ফেলবেন?`,
  "ui.loanDetails.deleteBody": (name, amount) =>
    `${name}-এর ঋণ (${amount}) ও এর সব ইতিহাস মুছে যাবে। এটা আর ফেরানো যাবে না।`,
  "ui.loanDetails.keepLoan": "ঋণ রাখুন",
  "ui.loanDetails.loanGiven": (amount, name, when) =>
    `${when}-এ ${name}-কে ৳${amount} ধার দেওয়া হয়েছে`,
  "ui.loanDetails.timelinePayment": (amount, when) =>
    `${when}-এ ৳${amount} ফেরত পাওয়া গেছে`,
  "ui.loanDetails.timelineReschedule": (from, to) =>
    `ফেরতের তারিখ ${from} থেকে ${to}-এ সরিয়ে নেওয়া হয়েছে`,
  "ui.loanDetails.timelinePaid": (when) =>
    `${when}-এ পরিশোধিত হিসেবে চিহ্নিত`,
  "ui.loanDetails.timelineUpcoming": (when) => `${when}-এ ফেরত দেওয়ার কথা`,
  "ui.loanDetails.dueIn": (n) =>
    n === 1 ? "১ দিনের মধ্যে ফেরত" : `${n} দিনের মধ্যে ফেরত`,
  "ui.loanDetails.overdueBy": (n) =>
    n === 1 ? "১ দিন বিলম্বিত" : `${n} দিন বিলম্বিত`,
  "ui.loanDetails.dueToday": "আজ ফেরত দেওয়ার কথা",
  "ui.loanDetails.paymentMethodLabel": "মাধ্যম",
  "ui.loanDetails.paymentMethod.aria": "পেমেন্টের মাধ্যম",
  "ui.loanDetails.status.aria": (status) => `ঋণের অবস্থা: ${status}`,
  "ui.loanDetails.recordPayment.title": "পেমেন্ট রেকর্ড করুন",
  "ui.loanDetails.recordPayment.subtitle": (remaining) =>
    `${remaining} বকেয়া`,
  "ui.loanDetails.recordPayment.amountLabel": "পরিমাণ",
  "ui.loanDetails.recordPayment.methodLabel": "মাধ্যম",
  "ui.loanDetails.recordPayment.dateLabel": "তারিখ",
  "ui.loanDetails.recordPayment.noteLabel": "নোট",
  "ui.loanDetails.recordPayment.save": "সংরক্ষণ",
  "ui.loanDetails.reschedule.title": "ফেরতের তারিখ পুনঃনির্ধারণ",
  "ui.loanDetails.reschedule.currentDue": "বর্তমান ফেরতের তারিখ",
  "ui.loanDetails.reschedule.newDue": "নতুন ফেরতের তারিখ",
  "ui.loanDetails.reschedule.reason": "কারণ (ঐচ্ছিক)",
  "ui.loanDetails.reschedule.reasonPlaceholder":
    "বন্ধু আগামী সপ্তাহে ভ্রমণে আছেন…",
  "ui.loanDetails.reschedule.notifyFriend":
    "নতুন তারিখ সম্পর্কে বন্ধুকে জানান",
  "ui.loanDetails.reschedule.save": "নতুন তারিখ সংরক্ষণ",
  "ui.loanDetails.sendReminder.title": "এখনই রিমাইন্ডার পাঠাবেন?",
  "ui.loanDetails.sendReminder.body": (name) =>
    `আমরা এক মিনিটের মধ্যে ${name}-কে একটি রিমাইন্ডার পাঠাবো।`,
  "ui.loanDetails.dash": "—",
  "ui.dashboard.overlineDate": (when) => String(when ?? ""),
  "ui.dashboard.date": (when) => String(when ?? ""),
  "ui.dashboard.goodDay": (name) => `আসসালামু আলাইকুম, ${name}`,
  "ui.dashboard.greeting": (greeting) => `${greeting}, আয়েশা`,
  "ui.dashboard.friendName": "আয়েশা",
  "ui.dashboard.title": "ড্যাশবোর্ড",
  "ui.landing.overline": (when) => String(when ?? ""),
  "ui.landing.mockup.greeting.morning": "Good morning, Ayesha",
  "ui.landing.mockup.greeting.afternoon": "Good afternoon, Ayesha",
  "ui.landing.mockup.greeting.evening": "Good evening, Ayesha",
  "ui.landing.mockup.greeting.night": "Good night, Ayesha",
  "ui.landing.mockup.greeting.morningBn": "সুপ্রভাত, আয়েশা",
  "ui.landing.mockup.greeting.afternoonBn": "নমস্কার, আয়েশা",
  "ui.landing.mockup.greeting.eveningBn": "শুভ সন্ধ্যা, আয়েশা",
  "ui.landing.mockup.greeting.nightBn": "শুভ রাত্রি, আয়েশা",
  "ui.landing.mockup.dueRafi": "Due 02 Oct 2026",
  "ui.landing.mockup.dueRafiBn": "২ অক্টোবর বকেয়া",
  "ui.landing.mockup.dueTanvir": "Due 15 Oct 2026",
  "ui.landing.mockup.dueTanvirBn": "১৫ অক্টোবর বকেয়া",
  "ui.landing.overline.date": "WED, 07 OCT",
  "ui.landing.overline.dateBn": "বুধ, ০৭ অক্টো",
  "ui.theme.toggleAria": "থিম পরিবর্তন",
  "ui.tone.friendly": "বন্ধুসুলভ",
  "ui.tone.neutral": "নিরপেক্ষ",
  "ui.tone.firm": "একগুঁয়ে",
  "ui.loanDetails.loanGivenNative": (amount, name, when) =>
    `${when}-এ ${name}-কে ৳${amount} ধার দেওয়া হয়েছে`,
  "ui.loanDetails.recordPayment.saved": "পেমেন্ট সংরক্ষিত।",
  "ui.loanDetails.timelineStatus.aria": (status) => `অবস্থা: ${status}`,
  "ui.emptyState.loans.title": "এখনো কোনো ঋণ নেই",
  "ui.emptyState.loans.body":
    "আপনার প্রথম ঋণ যোগ করুন, রিমাইন্ডার আমরা সামলাবো",
  "ui.emptyState.loans.cta": "ঋণ যোগ করুন",
  "ui.emptyState.reminders.title": "এখনো কোনো রিমাইন্ডার পাঠানো হয়নি",
  "ui.emptyState.reminders.body":
    "আপনার পাঠানো রিমাইন্ডার ও তাদের প্রাপ্তির অবস্থা এখানে দেখা যাবে।",
  "ui.friends.firstLoan.helper":
    "এখনো কোনো বন্ধু নেই — আপনার প্রথম ঋণ আপনার প্রথম বন্ধু তৈরি করবে।",
  "ui.friends.empty": "এই অনুসন্ধানে কোনো বন্ধু মেলেনি।",
  "ui.loanForm.title.create": "ঋণ যোগ করুন",
  "ui.loanForm.title.edit": "ঋণ সম্পাদনা",
  "ui.loanForm.eyebrow.create": "নতুন ঋণ",
  "ui.loanForm.eyebrow.edit": "ঋণ সম্পাদনা",
  "ui.loanForm.subtitle.create":
    "কত ধার দিলেন, কবে ফেরত চান, এবং কীভাবে মনে করাবেন — সব এখানে।",
  "ui.loanForm.subtitle.edit":
    "ঋণের তথ্য হালনাগাদ করুন। রিমাইন্ডারের সময়সূচি স্বয়ংক্রিয়ভাবে মানিয়ে নেওয়া হবে।",
  "ui.loanForm.section.friend": "বন্ধুর তথ্য",
  "ui.loanForm.section.loan": "ঋণের বিবরণ",
  "ui.loanForm.section.reminders": "রিমাইন্ডারের পছন্দ",
  "ui.loanForm.label.name": "পূর্ণ নাম",
  "ui.loanForm.label.phone": "ফোন",
  "ui.loanForm.label.email": "ইমেইল (ঐচ্ছিক)",
  "ui.loanForm.label.amount": "পরিমাণ",
  "ui.loanForm.label.dateGiven": "ধার দেওয়ার তারিখ",
  "ui.loanForm.label.dueDate": "ফেরতের তারিখ",
  "ui.loanForm.label.note": "ব্যক্তিগত নোট",
  "ui.loanForm.label.consent":
    "আমার বন্ধু জানেন যে তাঁর কাছে রিমাইন্ডার যেতে পারে।",
  "ui.loanForm.cancel": "বাতিল",
  "ui.loanForm.save": "ঋণ সংরক্ষণ",
  "ui.loanForm.saving": "সংরক্ষণ হচ্ছে…",
  "ui.loanForm.backToLoans": "ঋণের তালিকায় ফিরুন",
  "ui.loanForm.consent.helper": ({ terms, privacy }) =>
    `এই ঋণ সংরক্ষণ করার মাধ্যমে আপনি আমাদের ${terms} ও ${privacy} মেনে নিচ্ছেন।`,
  "ui.loanForm.termsIntro": "শর্তাবলী",
  "ui.loanForm.privacyIntro": "গোপনীয়তা নীতি",
  "ui.loanForm.toneAria": "রিমাইন্ডারের ভাষারীতি",
  "ui.loanForm.tone.friendly": "বন্ধুসুলভ",
  "ui.loanForm.tone.neutral": "নিরপেক্ষ",
  "ui.loanForm.tone.firm": "একগুঁয়ে",
  "ui.loanForm.smsTitle": "SMS রিমাইন্ডার",
  "ui.loanForm.smsSubtitle": "আপনার বন্ধুর ফোনে পাঠানো হবে।",
  "ui.loanForm.emailTitle": "ইমেইল রিমাইন্ডার",
  "ui.loanForm.emailSubtitle": "আপনার বন্ধুর ইনবক্সে পাঠানো হবে।",
  "ui.loanForm.messageLanguageHelper":
    "নতুন ঋণের জন্য রিমাইন্ডারে নির্ধারিত ভাষাই ডিফল্ট।",
  "ui.loanForm.messageLanguageUseDefault": "ডিফল্ট ব্যবহার করুন",
  "ui.loanForm.messageLanguageEnglish": "English",
  "ui.loanForm.messageLanguageBangla": "বাংলা",
  "ui.loanForm.errors.name": "বন্ধুর নাম লিখুন",
  "ui.loanForm.errors.phone": "একটি বৈধ ফোন নম্বর দিন",
  "ui.loanForm.errors.amount": "০-এর বেশি পরিমাণ লিখুন",
  "ui.loanForm.errors.dateGiven": "কখন ধার দিলেন তা বাছাই করুন",
  "ui.loanForm.errors.dueDate": "কবে ফেরত চান তা বাছাই করুন",
  "ui.loanForm.errors.dueAfterGiven":
    "ফেরতের তারিখ অবশ্যই ধার দেওয়ার তারিখের পরে হতে হবে",
  "ui.loanForm.errors.email": "একটি বৈধ ইমেইল দিন",
  "ui.loanForm.errors.consent": "সংরক্ষণের আগে অনুগ্রহ করে নিশ্চিত করুন",
  "ui.loanForm.saved": "ঋণ সংরক্ষিত হয়েছে। রিমাইন্ডার নির্ধারিত।",
  "ui.loanForm.failed": "ঋণ সংরক্ষণ করা যায়নি। আবার চেষ্টা করুন।",
  "ui.loanForm.note.helper": "শুধু আপনি এটি দেখতে পারবেন।",
  "ui.loanForm.dateGiven.placeholder": "একটি তারিখ বাছাই করুন",
  "ui.loanForm.dueDate.placeholder": "একটি তারিখ বাছাই করুন",
  "ui.loanForm.amount.helper":
    "আপনি যে পরিমাণ ধার দিয়েছেন তা লিখুন। ল্যাটিন বা বাংলা অঙ্ক ব্যবহার করতে পারেন।",
  "ui.loanForm.amountNote": "শুধু আপনি এটি দেখতে পারবেন।",
  "ui.loanForm.preview": (preview) => String(preview ?? ""),
  "ui.loanForm.previewHelper": "টাইপ করার সাথে সাথে প্রিভিউ দেখুন।",
  "ui.loanForm.amountPreview": (amount) => `≈ ${amount}`,
  "ui.payment.title": "পেমেন্ট রেকর্ড করুন",
  "ui.payment.subtitle": (remaining) => `${remaining} বকেয়া।`,
  "ui.payment.amount": "পরিমাণ",
  "ui.payment.method": "মাধ্যম",
  "ui.payment.date": "তারিখ",
  "ui.payment.note": "নোট",
  "ui.payment.save": "সংরক্ষণ",
  "ui.payment.amountHelper": "বকেয়া পরিমাণের বেশি নয়।",
  "ui.payment.exceedsRemaining": (max) => `পরিমাণ ${max}-এর বেশি হতে পারবে না।`,
  "ui.reschedule.title": "ফেরতের তারিখ পুনঃনির্ধারণ",
  "ui.reschedule.currentDue": "বর্তমান ফেরতের তারিখ",
  "ui.reschedule.newDue": "নতুন ফেরতের তারিখ",
  "ui.reschedule.reason": "কারণ (ঐচ্ছিক)",
  "ui.reschedule.reasonPlaceholder": "বন্ধু আগামী সপ্তাহে ভ্রমণে আছেন…",
  "ui.reschedule.save": "নতুন তারিখ সংরক্ষণ",
  "ui.reschedule.notifyFriend": "নতুন তারিখ সম্পর্কে বন্ধুকে জানান",
  "ui.reschedule.cancel": "বাতিল",
  "ui.legal.termsMeta":
    "লোন রিমাইন্ডার ব্যবহারের শর্তাবলী। আইনি পর্যালোচনার জন্য খসড়া।",
  "ui.legal.privacyMeta":
    "লোন রিমাইন্ডার কী তথ্য সংগ্রহ করে, কেন এবং কীভাবে সংরক্ষণ করে। আইনি পর্যালোচনার জন্য খসড়া।",
  "ui.legal.lastUpdated": "সর্বশেষ হালনাগাদ",
  "ui.notifications.markedAllRead": "সব বিজ্ঞপ্তি পঠিত হিসেবে চিহ্নিত।",
  "ui.notifications.deleted": "বিজ্ঞপ্তি মুছে ফেলা হয়েছে।",
  "ui.errorBoundary.title": "কিছু ভুল হয়েছে",
  "ui.errorBoundary.heading": "আমরা একটি সমস্যায় পড়েছি",
  "ui.errorBoundary.body": "একটি অপ্রত্যাশিত ত্রুটি ঘটেছে।",
  "ui.errorBoundary.retry": "আবার চেষ্টা করুন",
  "ui.errorBoundary.backHome": "হোমে ফিরুন",
  "ui.errorBoundary.backToDashboard": "ড্যাশবোর্ডে ফিরুন",
  "ui.errorBoundary.couldntLoad": "এই পাতাটি লোড করা যায়নি",
  "ui.notFound.eyebrow": "পাতা পাওয়া যায়নি",
  "ui.notFound.title": "এই পাতাটি হারিয়ে গেছে",
  "ui.notFound.appTitle": "আমরা ওই পাতাটি খুঁজে পাচ্ছি না",
  "ui.notFound.body": "আসুন ড্যাশবোর্ডে ফিরে যাই।",
  "ui.notFound.appBody":
    "আপনি যে পাতাটি খুঁজছেন তা হয়তো সরিয়ে নেওয়া, নাম বদলে যাওয়া বা কখনো ছিল না। ড্যাশবোর্ডে ফিরে যান।",
  "ui.notFound.back": "← ড্যাশবোর্ডে যান",
  "ui.notFound.appBack": "← ড্যাশবোর্ডে ফিরুন",
  "ui.notFound.empty": "ঋণের খালি অবস্থা",
  "ui.app.loading": "লোন রিমাইন্ডার লোড হচ্ছে…",
  "ui.app.loadingShort": "লোড হচ্ছে…",
  "ui.friends.backLink": "বন্ধুদের তালিকায় ফিরুন",
  "ui.legal.banglaNotice":
    "এই পৃষ্ঠাটি এখনো শুধু ইংরেজিতে পাওয়া যায়",
  "ui.reports.title.meta": "রিপোর্ট — লোন রিমাইন্ডার",
  "ui.legal.termsTitle.meta": "শর্তাবলী — লোন রিমাইন্ডার",
  "ui.legal.privacyTitle.meta": "গোপনীয়তা নীতি — লোন রিমাইন্ডার",
  "ui.marketing.homeAria": "লোন রিমাইন্ডার হোম",
  "ui.marketing.navAria": "প্রধান",
  "ui.notifications.markAllAria": "সব বিজ্ঞপ্তি পঠিত হিসেবে চিহ্নিত করুন",
  "ui.notifications.openAria": "বিজ্ঞপ্তি খুলুন",
  "ui.payment.modalTitle": "পেমেন্ট রেকর্ড করুন",
  "ui.payment.titleLoan": "পেমেন্ট রেকর্ড করুন",
  "ui.payment.recorded": "পেমেন্ট রেকর্ড হয়েছে।",
  "ui.payment.deleted": "পেমেন্ট মুছে ফেলা হয়েছে।",
  "ui.payment.remaining": (amount) => `${amount} বকেয়া`,
  "ui.payment.method.cash": "নগদ",
  "ui.payment.method.bkash": "বিকাশ",
  "ui.payment.method.nagad": "নগদ (Nagad)",
  "ui.payment.method.bank": "ব্যাংক",
  "ui.payment.method.other": "অন্যান্য",
  "ui.loanDetails.timeline.cash": "নগদ",
  "ui.loanDetails.timeline.bkash": "বিকাশ",
  "ui.loanDetails.timeline.nagad": "নগদ (Nagad)",
  "ui.loanDetails.timeline.bank": "ব্যাংক",
  "ui.loanDetails.timeline.other": "অন্যান্য",
  "ui.method.sms": "SMS",
  "ui.method.email": "ইমেইল",
  "ui.method.tone.friendly": "বন্ধুসুলভ",
  "ui.method.tone.neutral": "নিরপেক্ষ",
  "ui.method.tone.firm": "একগুঁয়ে",
  "ui.emptyState.default": "—",
  "ui.notFound.link": "← ড্যাশবোর্ডে যান",
  "ui.emptyState.heading": "এখানে এখনো কিছু নেই।",
  "ui.emptyState.body": "প্রথম আইটেম যোগ করলে এখানে দেখা যাবে।",
  "ui.app.globalLoadingAria": "লোড হচ্ছে…",
  "marketing.nav.aria": "প্রাইমারি",
  "marketing.featuresLink": "বৈশিষ্ট্য",
  "marketing.howItWorksLink": "কীভাবে কাজ করে",
  "marketing.logIn": "লগ ইন",
  "marketing.getStarted": "শুরু করুন",
  "marketing.openMenu": "মেনু খুলুন",
  "marketing.closeMenu": "মেনু বন্ধ করুন",
  "marketing.footerTagline":
    "লোন রিমাইন্ডার · পরিবার ও বন্ধুদের জন্য তৈরি।",
  "marketing.termsLink": "শর্তাবলী",
  "marketing.privacyLink": "গোপনীয়তা",
  "ui.loanForm.cancelAria": "বাতিল",
  "ui.loanForm.saveAria": "ঋণ সংরক্ষণ",
  "ui.loanForm.savingAria": "ঋণ সংরক্ষণ হচ্ছে…",
  "ui.loanForm.helperAria": "ক্ষেত্রের সহায়ক টেক্সট",
  "ui.loanForm.errorAria": "ক্ষেত্রের ত্রুটি",
  "ui.loanForm.namePlaceholder": "বন্ধুর পূর্ণ নাম",
  "ui.loanForm.notePlaceholder": "ব্যক্তিগত নোট যোগ করুন (ঐচ্ছিক)",
  "ui.loanForm.toneQuestion": "রিমাইন্ডারের ভাষারীতি কেমন হবে?",
};
