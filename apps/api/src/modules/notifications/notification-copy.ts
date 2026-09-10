import type { NotificationLocale } from "@nirman-app/shared";

type Copy = { title: string; body: string };

const copy: Record<NotificationLocale, Record<string, Copy>> = {
  en: {
    MATERIAL_VERIFICATION_REQUIRED: {
      title: "Material verification required",
      body: "A material request is waiting for your review.",
    },
    MATERIAL_FINAL_APPROVAL_REQUIRED: {
      title: "Material approval required",
      body: "A material request is waiting for final approval.",
    },
    MATERIAL_REQUEST_RETURNED: {
      title: "Material request returned",
      body: "Your material request needs changes.",
    },
    MATERIAL_REQUEST_APPROVED: {
      title: "Material request approved",
      body: "Your material request was approved.",
    },
    MATERIAL_REQUEST_REJECTED: {
      title: "Material request rejected",
      body: "Your material request was rejected.",
    },
    MATERIAL_PURCHASE_RECORDED: {
      title: "Material purchase recorded",
      body: "A purchase was recorded for your material request.",
    },
    MATERIAL_DELIVERY_RECORDED: {
      title: "Material delivery recorded",
      body: "A delivery was recorded for your material request.",
    },
    EXPENSE_APPROVAL_REQUIRED: {
      title: "Expense approval required",
      body: "A site expense is waiting for your review.",
    },
    EXPENSE_APPROVED: {
      title: "Expense approved",
      body: "Your site expense was approved.",
    },
    EXPENSE_REJECTED: {
      title: "Expense rejected",
      body: "Your site expense was rejected.",
    },
    EXPENSE_ADJUSTED: {
      title: "Expense adjusted",
      body: "An approved site expense was corrected.",
    },
    GALLERY_APPROVAL_REQUIRED: {
      title: "Gallery review required",
      body: "A Project diary photo is waiting for review.",
    },
    GALLERY_APPROVED: {
      title: "Gallery photo approved",
      body: "Your Project diary photo is now published.",
    },
    GALLERY_REJECTED: {
      title: "Gallery photo needs attention",
      body: "Your Project diary photo was rejected.",
    },
  },
  hi: {
    MATERIAL_VERIFICATION_REQUIRED: {
      title: "सामग्री सत्यापन आवश्यक",
      body: "एक सामग्री अनुरोध आपकी समीक्षा की प्रतीक्षा में है।",
    },
    MATERIAL_FINAL_APPROVAL_REQUIRED: {
      title: "सामग्री अनुमोदन आवश्यक",
      body: "एक सामग्री अनुरोध अंतिम अनुमोदन की प्रतीक्षा में है।",
    },
    MATERIAL_REQUEST_RETURNED: {
      title: "सामग्री अनुरोध वापस आया",
      body: "आपके सामग्री अनुरोध में बदलाव आवश्यक हैं।",
    },
    MATERIAL_REQUEST_APPROVED: {
      title: "सामग्री अनुरोध स्वीकृत",
      body: "आपका सामग्री अनुरोध स्वीकृत हुआ।",
    },
    MATERIAL_REQUEST_REJECTED: {
      title: "सामग्री अनुरोध अस्वीकृत",
      body: "आपका सामग्री अनुरोध अस्वीकृत हुआ।",
    },
    MATERIAL_PURCHASE_RECORDED: {
      title: "सामग्री खरीद दर्ज",
      body: "आपके सामग्री अनुरोध के लिए खरीद दर्ज हुई।",
    },
    MATERIAL_DELIVERY_RECORDED: {
      title: "सामग्री डिलीवरी दर्ज",
      body: "आपके सामग्री अनुरोध के लिए डिलीवरी दर्ज हुई।",
    },
    EXPENSE_APPROVAL_REQUIRED: {
      title: "खर्च अनुमोदन आवश्यक",
      body: "एक साइट खर्च आपकी समीक्षा की प्रतीक्षा में है।",
    },
    EXPENSE_APPROVED: {
      title: "खर्च स्वीकृत",
      body: "आपका साइट खर्च स्वीकृत हुआ।",
    },
    EXPENSE_REJECTED: {
      title: "खर्च अस्वीकृत",
      body: "आपका साइट खर्च अस्वीकृत हुआ।",
    },
    EXPENSE_ADJUSTED: {
      title: "खर्च समायोजित",
      body: "स्वीकृत साइट खर्च में सुधार किया गया।",
    },
    GALLERY_APPROVAL_REQUIRED: {
      title: "गैलरी समीक्षा आवश्यक",
      body: "एक प्रोजेक्ट डायरी फ़ोटो समीक्षा की प्रतीक्षा में है।",
    },
    GALLERY_APPROVED: {
      title: "गैलरी फ़ोटो स्वीकृत",
      body: "आपकी प्रोजेक्ट डायरी फ़ोटो प्रकाशित हो गई।",
    },
    GALLERY_REJECTED: {
      title: "गैलरी फ़ोटो पर ध्यान दें",
      body: "आपकी प्रोजेक्ट डायरी फ़ोटो अस्वीकृत हुई।",
    },
  },
  gu: {
    MATERIAL_VERIFICATION_REQUIRED: {
      title: "સામગ્રી ચકાસણી જરૂરી",
      body: "એક સામગ્રી વિનંતી તમારી સમીક્ષાની રાહ જોઈ રહી છે.",
    },
    MATERIAL_FINAL_APPROVAL_REQUIRED: {
      title: "સામગ્રી મંજૂરી જરૂરી",
      body: "એક સામગ્રી વિનંતી અંતિમ મંજૂરીની રાહ જોઈ રહી છે.",
    },
    MATERIAL_REQUEST_RETURNED: {
      title: "સામગ્રી વિનંતી પરત આવી",
      body: "તમારી સામગ્રી વિનંતીમાં ફેરફાર જરૂરી છે.",
    },
    MATERIAL_REQUEST_APPROVED: {
      title: "સામગ્રી વિનંતી મંજૂર",
      body: "તમારી સામગ્રી વિનંતી મંજૂર થઈ.",
    },
    MATERIAL_REQUEST_REJECTED: {
      title: "સામગ્રી વિનંતી નામંજૂર",
      body: "તમારી સામગ્રી વિનંતી નામંજૂર થઈ.",
    },
    MATERIAL_PURCHASE_RECORDED: {
      title: "સામગ્રી ખરીદી નોંધાઈ",
      body: "તમારી સામગ્રી વિનંતી માટે ખરીદી નોંધાઈ.",
    },
    MATERIAL_DELIVERY_RECORDED: {
      title: "સામગ્રી ડિલિવરી નોંધાઈ",
      body: "તમારી સામગ્રી વિનંતી માટે ડિલિવરી નોંધાઈ.",
    },
    EXPENSE_APPROVAL_REQUIRED: {
      title: "ખર્ચ મંજૂરી જરૂરી",
      body: "એક સાઇટ ખર્ચ તમારી સમીક્ષાની રાહ જોઈ રહ્યો છે.",
    },
    EXPENSE_APPROVED: {
      title: "ખર્ચ મંજૂર",
      body: "તમારો સાઇટ ખર્ચ મંજૂર થયો.",
    },
    EXPENSE_REJECTED: {
      title: "ખર્ચ નામંજૂર",
      body: "તમારો સાઇટ ખર્ચ નામંજૂર થયો.",
    },
    EXPENSE_ADJUSTED: {
      title: "ખર્ચ સમાયોજિત",
      body: "મંજૂર સાઇટ ખર્ચમાં સુધારો થયો.",
    },
    GALLERY_APPROVAL_REQUIRED: {
      title: "ગેલેરી સમીક્ષા જરૂરી",
      body: "એક પ્રોજેક્ટ ડાયરી ફોટો સમીક્ષાની રાહ જોઈ રહ્યો છે.",
    },
    GALLERY_APPROVED: {
      title: "ગેલેરી ફોટો મંજૂર",
      body: "તમારો પ્રોજેક્ટ ડાયરી ફોટો પ્રકાશિત થયો.",
    },
    GALLERY_REJECTED: {
      title: "ગેલેરી ફોટા પર ધ્યાન આપો",
      body: "તમારો પ્રોજેક્ટ ડાયરી ફોટો નામંજૂર થયો.",
    },
  },
};

export function notificationCopy(
  locale: NotificationLocale,
  type: string,
  fallback: Copy,
): Copy {
  return copy[locale][type] ?? fallback;
}
