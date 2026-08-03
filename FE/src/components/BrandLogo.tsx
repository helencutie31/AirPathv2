import logoAirPath from "@/assets/branding/logoAirPath_new02.png";

type Props = {
  alt?: string;
  className?: string;
};

export function BrandLogo({ alt = "AirPath logo", className = "" }: Props) {
  return <img src={logoAirPath} alt={alt} className={className} />;
}
