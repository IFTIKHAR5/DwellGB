// components/icons.jsx — every icon on the website comes from here.
//
// Icon library: Hugeicons (https://hugeicons.com, free set, MIT) — rounded, 1.5px line icons.
// The phone app uses the very same icons (mobile/src/components/icons.js). Pages import icons
// by simple names:
//
//   import { Search, MapPin } from '@/components/icons';
//   <MapPin className="w-4 h-4" />
//
// To switch an icon for the whole site, change it once in the list below.
// A class like "fill-gold" or "fill-brand" (or weight="fill") shows the solid version
// (filled stars, the saved heart, the verified badge). weight="duotone" adds a soft tint.
// Each icon is imported on its own, so only the icons listed here end up in the website bundle.
import { createElement, forwardRef } from 'react';
import hiAdd01 from '@hugeicons/core-free-icons/Add01Icon';
import hiAlbum02 from '@hugeicons/core-free-icons/Album02Icon';
import hiAlert02 from '@hugeicons/core-free-icons/Alert02Icon';
import hiArrowDown01 from '@hugeicons/core-free-icons/ArrowDown01Icon';
import hiArrowLeft01 from '@hugeicons/core-free-icons/ArrowLeft01Icon';
import hiArrowLeft02 from '@hugeicons/core-free-icons/ArrowLeft02Icon';
import hiArrowRight01 from '@hugeicons/core-free-icons/ArrowRight01Icon';
import hiArrowRight02 from '@hugeicons/core-free-icons/ArrowRight02Icon';
import hiArrowTurnBackward from '@hugeicons/core-free-icons/ArrowTurnBackwardIcon';
import hiArrowUp02 from '@hugeicons/core-free-icons/ArrowUp02Icon';
import hiAttachment01 from '@hugeicons/core-free-icons/Attachment01Icon';
import hiBathtub01 from '@hugeicons/core-free-icons/Bathtub01Icon';
import hiBatteryCharging01 from '@hugeicons/core-free-icons/BatteryCharging01Icon';
import hiBedDouble from '@hugeicons/core-free-icons/BedDoubleIcon';
import hiBubbleChat from '@hugeicons/core-free-icons/BubbleChatIcon';
import hiBuilding03 from '@hugeicons/core-free-icons/Building03Icon';
import hiCalendar02 from '@hugeicons/core-free-icons/Calendar02Icon';
import hiCalendar03 from '@hugeicons/core-free-icons/Calendar03Icon';
import hiCalendarCheckIn01 from '@hugeicons/core-free-icons/CalendarCheckIn01Icon';
import hiCalendarRemove01 from '@hugeicons/core-free-icons/CalendarRemove01Icon';
import hiCall02 from '@hugeicons/core-free-icons/Call02Icon';
import hiCamera01 from '@hugeicons/core-free-icons/Camera01Icon';
import hiCameraRotated01 from '@hugeicons/core-free-icons/CameraRotated01Icon';
import hiCancel01 from '@hugeicons/core-free-icons/Cancel01Icon';
import hiCar01 from '@hugeicons/core-free-icons/Car01Icon';
import hiCctv from '@hugeicons/core-free-icons/CctvIcon';
import hiChartColumn from '@hugeicons/core-free-icons/ChartColumnIcon';
import hiCheckmarkBadge01 from '@hugeicons/core-free-icons/CheckmarkBadge01Icon';
import hiCheckmarkCircle02 from '@hugeicons/core-free-icons/CheckmarkCircle02Icon';
import hiClock01 from '@hugeicons/core-free-icons/Clock01Icon';
import hiCoins01 from '@hugeicons/core-free-icons/Coins01Icon';
import hiDashboardSquare01 from '@hugeicons/core-free-icons/DashboardSquare01Icon';
import hiDelete02 from '@hugeicons/core-free-icons/Delete02Icon';
import hiDoor01 from '@hugeicons/core-free-icons/Door01Icon';
import hiDroplet from '@hugeicons/core-free-icons/DropletIcon';
import hiFaceId from '@hugeicons/core-free-icons/FaceIdIcon';
import hiFavourite from '@hugeicons/core-free-icons/FavouriteIcon';
import hiFence from '@hugeicons/core-free-icons/FenceIcon';
import hiFilterHorizontal from '@hugeicons/core-free-icons/FilterHorizontalIcon';
import hiFire from '@hugeicons/core-free-icons/FireIcon';
import hiFlag02 from '@hugeicons/core-free-icons/Flag02Icon';
import hiFlash from '@hugeicons/core-free-icons/FlashIcon';
import hiGithub from '@hugeicons/core-free-icons/GithubIcon';
import hiGlobe02 from '@hugeicons/core-free-icons/Globe02Icon';
import hiGps01 from '@hugeicons/core-free-icons/Gps01Icon';
import hiGridView from '@hugeicons/core-free-icons/GridViewIcon';
import hiHome03 from '@hugeicons/core-free-icons/Home03Icon';
import hiHospital01 from '@hugeicons/core-free-icons/Hospital01Icon';
import hiHourglass from '@hugeicons/core-free-icons/HourglassIcon';
import hiId from '@hugeicons/core-free-icons/IdIcon';
import hiImage01 from '@hugeicons/core-free-icons/Image01Icon';
import hiImageAdd01 from '@hugeicons/core-free-icons/ImageAdd01Icon';
import hiImageNotFound01 from '@hugeicons/core-free-icons/ImageNotFound01Icon';
import hiInbox from '@hugeicons/core-free-icons/InboxIcon';
import hiInformationCircle from '@hugeicons/core-free-icons/InformationCircleIcon';
import hiInvoice01 from '@hugeicons/core-free-icons/Invoice01Icon';
import hiKey01 from '@hugeicons/core-free-icons/Key01Icon';
import hiKitchenUtensils from '@hugeicons/core-free-icons/KitchenUtensilsIcon';
import hiLinkedin01 from '@hugeicons/core-free-icons/Linkedin01Icon';
import hiLinkSquare02 from '@hugeicons/core-free-icons/LinkSquare02Icon';
import hiLoading03 from '@hugeicons/core-free-icons/Loading03Icon';
import hiLocation01 from '@hugeicons/core-free-icons/Location01Icon';
import hiLocationOffline01 from '@hugeicons/core-free-icons/LocationOffline01Icon';
import hiLogout03 from '@hugeicons/core-free-icons/Logout03Icon';
import hiMail01 from '@hugeicons/core-free-icons/Mail01Icon';
import hiMailOpen01 from '@hugeicons/core-free-icons/MailOpen01Icon';
import hiMapsLocation01 from '@hugeicons/core-free-icons/MapsLocation01Icon';
import hiMegaphone01 from '@hugeicons/core-free-icons/Megaphone01Icon';
import hiMenu01 from '@hugeicons/core-free-icons/Menu01Icon';
import hiMessage01 from '@hugeicons/core-free-icons/Message01Icon';
import hiMic01 from '@hugeicons/core-free-icons/Mic01Icon';
import hiMortarboard02 from '@hugeicons/core-free-icons/Mortarboard02Icon';
import hiMountain from '@hugeicons/core-free-icons/MountainIcon';
import hiNotification01 from '@hugeicons/core-free-icons/Notification01Icon';
import hiNotification03 from '@hugeicons/core-free-icons/Notification03Icon';
import hiPencilEdit02 from '@hugeicons/core-free-icons/PencilEdit02Icon';
import hiRefresh from '@hugeicons/core-free-icons/RefreshIcon';
import hiRoute01 from '@hugeicons/core-free-icons/Route01Icon';
import hiRuler from '@hugeicons/core-free-icons/RulerIcon';
import hiSearch01 from '@hugeicons/core-free-icons/Search01Icon';
import hiSearchRemove from '@hugeicons/core-free-icons/SearchRemoveIcon';
import hiSecurity from '@hugeicons/core-free-icons/SecurityIcon';
import hiSent from '@hugeicons/core-free-icons/SentIcon';
import hiSettings02 from '@hugeicons/core-free-icons/Settings02Icon';
import hiShare08 from '@hugeicons/core-free-icons/Share08Icon';
import hiShield02 from '@hugeicons/core-free-icons/Shield02Icon';
import hiShieldBlockchain from '@hugeicons/core-free-icons/ShieldBlockchainIcon';
import hiShoppingBasket01 from '@hugeicons/core-free-icons/ShoppingBasket01Icon';
import hiShowerHead from '@hugeicons/core-free-icons/ShowerHeadIcon';
import hiSofa01 from '@hugeicons/core-free-icons/Sofa01Icon';
import hiSofa02 from '@hugeicons/core-free-icons/Sofa02Icon';
import hiSquareArrowExpand01 from '@hugeicons/core-free-icons/SquareArrowExpand01Icon';
import hiSquareLock02 from '@hugeicons/core-free-icons/SquareLock02Icon';
import hiStar from '@hugeicons/core-free-icons/StarIcon';
import hiSun03 from '@hugeicons/core-free-icons/Sun03Icon';
import hiTable01 from '@hugeicons/core-free-icons/Table01Icon';
import hiThermometer from '@hugeicons/core-free-icons/ThermometerIcon';
import hiTick02 from '@hugeicons/core-free-icons/Tick02Icon';
import hiTickDouble02 from '@hugeicons/core-free-icons/TickDouble02Icon';
import hiTranslate from '@hugeicons/core-free-icons/TranslateIcon';
import hiTree06 from '@hugeicons/core-free-icons/Tree06Icon';
import hiUpload04 from '@hugeicons/core-free-icons/Upload04Icon';
import hiUser from '@hugeicons/core-free-icons/UserIcon';
import hiUserCircle from '@hugeicons/core-free-icons/UserCircleIcon';
import hiUserGroup from '@hugeicons/core-free-icons/UserGroupIcon';
import hiUserMultiple02 from '@hugeicons/core-free-icons/UserMultiple02Icon';
import hiView from '@hugeicons/core-free-icons/ViewIcon';
import hiViewOff from '@hugeicons/core-free-icons/ViewOffIcon';
import hiWallet01 from '@hugeicons/core-free-icons/Wallet01Icon';
import hiWifi01 from '@hugeicons/core-free-icons/Wifi01Icon';

const STROKE = { light: 1.25, regular: 1.5, bold: 2, fill: 1.5, duotone: 1.5 };

function makeIcon(data, name) {
  const Icon = forwardRef(function Icon({ className = '', size, color, weight, strokeWidth, style, ...props }, ref) {
    const w = weight || (/(^|\s)fill-/.test(className) ? 'fill' : 'regular');
    const sw = strokeWidth ?? STROKE[w] ?? 1.5;
    return (
      <svg
        ref={ref}
        viewBox="0 0 24 24"
        width={size ?? '1em'}
        height={size ?? '1em'}
        fill="none"
        className={`shrink-0 ${className}`}
        style={color ? { color, ...style } : style}
        aria-hidden={props['aria-label'] ? undefined : true}
        {...props}
      >
        {data.map(([tag, { key, ...attrs }], i) => { // eslint-disable-line no-unused-vars
          const p = { ...attrs };
          if (p.strokeWidth !== undefined) p.strokeWidth = sw;
          // fill: the outer shape is solid, inner marks (the tick in a badge) turn white.
          if (w === 'fill') {
            if (i === 0) p.fill = 'currentColor';
            else if (p.stroke) p.stroke = '#fff';
          }
          // duotone: a soft tint inside the outer shape, line on top.
          if (w === 'duotone' && i === 0 && !attrs.fill) { p.fill = 'currentColor'; p.fillOpacity = 0.14; }
          return createElement(tag, { key: i, ...p });
        })}
      </svg>
    );
  });
  Icon.displayName = name;
  return Icon;
}

// Our name → Hugeicons icon (kept identical to mobile/src/components/icons.js)
const MAP = {
  Armchair: hiSofa02,
  ArrowLeft: hiArrowLeft02,
  ArrowRight: hiArrowRight02,
  ArrowUp: hiArrowUp02,
  BadgeCheck: hiCheckmarkBadge01,
  Ban: hiCancel01,
  BarChart3: hiChartColumn,
  Bath: hiBathtub01,
  BatteryCharging: hiBatteryCharging01,
  BedDouble: hiBedDouble,
  Bell: hiNotification01,
  BellRing: hiNotification03,
  Building2: hiBuilding03,
  CalendarCheck: hiCalendarCheckIn01,
  CalendarClock: hiCalendar02,
  CalendarDays: hiCalendar03,
  CalendarDots: hiCalendar02,
  CalendarRange: hiCalendar02,
  CalendarX: hiCalendarRemove01,
  Camera: hiCamera01,
  Car: hiCar01,
  Cctv: hiCctv,
  ChartBar: hiChartColumn,
  ChatDots: hiBubbleChat,
  Check: hiTick02,
  CheckCheck: hiTickDouble02,
  Checks: hiTickDouble02,
  ChefHat: hiKitchenUtensils,
  ChevronDown: hiArrowDown01,
  ChevronLeft: hiArrowLeft01,
  ChevronRight: hiArrowRight01,
  CircleCheck: hiCheckmarkCircle02,
  Clock: hiClock01,
  Coins: hiCoins01,
  DoorOpen: hiDoor01,
  Droplets: hiDroplet,
  EnvelopeOpen: hiMailOpen01,
  ExternalLink: hiLinkSquare02,
  Eye: hiView,
  EyeOff: hiViewOff,
  Fence: hiFence,
  Flag: hiFlag02,
  Flame: hiFire,
  FrameCorners: hiSquareArrowExpand01,
  Github: hiGithub,
  Globe: hiGlobe02,
  GraduationCap: hiMortarboard02,
  Grid3x3: hiGridView,
  Heart: hiFavourite,
  Home: hiHome03,
  Hospital: hiHospital01,
  Hourglass: hiHourglass,
  HourglassMedium: hiHourglass,
  IdCard: hiId,
  ImageBroken: hiImageNotFound01,
  ImageIcon: hiImage01,
  ImageOff: hiImageNotFound01,
  ImagePlus: hiImageAdd01,
  Images: hiAlbum02,
  Inbox: hiInbox,
  Info: hiInformationCircle,
  KeyRound: hiKey01,
  Languages: hiTranslate,
  LayoutDashboard: hiDashboardSquare01,
  Linkedin: hiLinkedin01,
  List: hiMenu01,
  LoaderCircle: hiLoading03,
  LocateFixed: hiGps01,
  Lock: hiSquareLock02,
  LogOut: hiLogout03,
  Mail: hiMail01,
  Map: hiMapsLocation01,
  MapPin: hiLocation01,
  MapPinOff: hiLocationOffline01,
  Megaphone: hiMegaphone01,
  Menu: hiMenu01,
  MessageCircle: hiMessage01,
  Mic: hiMic01,
  Mountain: hiMountain,
  Paperclip: hiAttachment01,
  Pencil: hiPencilEdit02,
  Phone: hiCall02,
  Plus: hiAdd01,
  Prohibit: hiCancel01,
  Receipt: hiInvoice01,
  RefreshCw: hiRefresh,
  RotateCcw: hiArrowTurnBackward,
  Route: hiRoute01,
  Ruler: hiRuler,
  ScanFace: hiFaceId,
  Search: hiSearch01,
  SearchX: hiSearchRemove,
  Send: hiSent,
  Settings: hiSettings02,
  Share2: hiShare08,
  ShieldAlert: hiAlert02,
  ShieldCheck: hiShield02,
  ShieldOff: hiShieldBlockchain,
  ShieldQuestion: hiSecurity,
  ShoppingBasket: hiShoppingBasket01,
  ShowerHead: hiShowerHead,
  SlidersHorizontal: hiFilterHorizontal,
  Sofa: hiSofa01,
  Star: hiStar,
  Sun: hiSun03,
  SwitchCamera: hiCameraRotated01,
  Table2: hiTable01,
  Thermometer: hiThermometer,
  Trash2: hiDelete02,
  Tray: hiInbox,
  Trees: hiTree06,
  Upload: hiUpload04,
  User: hiUser,
  UserCircle: hiUserCircle,
  Users: hiUserGroup,
  UsersThree: hiUserMultiple02,
  Wallet: hiWallet01,
  Wifi: hiWifi01,
  X: hiCancel01,
  Zap: hiFlash,
};

const icons = Object.fromEntries(Object.entries(MAP).map(([name, data]) => [name, makeIcon(data, name)]));

export const {
  Armchair, ArrowLeft, ArrowRight, ArrowUp, BadgeCheck, Ban, BarChart3, Bath, BatteryCharging, BedDouble,
  Bell, BellRing, Building2, CalendarCheck, CalendarClock, CalendarDays, CalendarDots, CalendarRange, CalendarX, Camera,
  Car, Cctv, ChartBar, ChatDots, Check, CheckCheck, Checks, ChefHat, ChevronDown, ChevronLeft,
  ChevronRight, CircleCheck, Clock, Coins, DoorOpen, Droplets, EnvelopeOpen, ExternalLink, Eye, EyeOff,
  Fence, Flag, Flame, FrameCorners, Github, Globe, GraduationCap, Grid3x3, Heart, Home,
  Hospital, Hourglass, HourglassMedium, IdCard, ImageBroken, ImageIcon, ImageOff, ImagePlus, Images, Inbox,
  Info, KeyRound, Languages, LayoutDashboard, Linkedin, List, LoaderCircle, LocateFixed, Lock, LogOut,
  Mail, Map, MapPin, MapPinOff, Megaphone, Menu, MessageCircle, Mic, Mountain, Paperclip,
  Pencil, Phone, Plus, Prohibit, Receipt, RefreshCw, RotateCcw, Route, Ruler, ScanFace,
  Search, SearchX, Send, Settings, Share2, ShieldAlert, ShieldCheck, ShieldOff, ShieldQuestion, ShoppingBasket,
  ShowerHead, SlidersHorizontal, Sofa, Star, Sun, SwitchCamera, Table2, Thermometer, Trash2, Tray,
  Trees, Upload, User, UserCircle, Users, UsersThree, Wallet, Wifi, X, Zap,
} = icons;

// shadcn/ui components import "XIcon".
export const XIcon = X;
