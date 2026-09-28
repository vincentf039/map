import { GeoJSON, MapContainer, TileLayer, useMap } from "react-leaflet";
import municipalities from "../municipalities.geo.json";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import L, {
  type Map as LeafletMap,
  type Path,
  type PathOptions,
} from "leaflet";
import type { Settings } from "./main";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import moment from "moment-timezone";

type RawNotice = {
  date_created: string;
  city: string;
  province?: string;
  funeral: string;
  id?: number;
};

type FuneralHome = {
  barangay?: string;
  city: string;
  province?: string;
  funeral_director?: number[];
  funeral_director_names?: string[];
  id?: number;
  lat?: string | number;
  lng?: string | number;
  street?: string;
  street_number?: string;
  title?: string;
};

type Notice = {
  municipality: string;
  province: string;
  region?: string;
  key: string;
  notice_week: number;
  notice_total: number;
  services: number;
};

type MunicipalityProperties = {
  NAME_2?: string;
  ENGTYPE_2?: string;
  PROVINCE?: string;
  REGION?: string;
};

type SearchItem = {
  key: string;
  municipality: string;
  province: string;
  region: string;
  label: string;
  searchText: string;
  feature: Feature<Geometry, MunicipalityProperties>;
};

const LUZON_CENTER: [number, number] = [16.0, 121.0];
const LUZON_ZOOM = 8;

const featureCollection = municipalities as unknown as FeatureCollection<
  Geometry,
  MunicipalityProperties
>;

const cleanText = (value?: string) =>
  String(value || "")
    .normalize("NFKD")
    .replace(/[^\w\s.-]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const normalizeProvince = (value?: string) => {
  const v = cleanText(value);

  const aliases: Record<string, string> = {
    "metro manila": "metropolitan manila",
    ncr: "metropolitan manila",
    "north cotabato": "cotabato",
    "cotabato province": "cotabato",
  };

  return aliases[v] || v;
};

const normalizeMunicipality = (value?: string) => {
  const v = cleanText(value);

  const aliases: Record<string, string> = {
    "city of olongapo": "olongapo",
    "olongapo city": "olongapo",
    "city of manila": "manila",
    "manila city": "manila",
    "city of makati": "makati",
    "makati city": "makati",
    "city of pasig": "pasig",
    "pasig city": "pasig",
    "city of cebu": "cebu",
    "cebu city": "cebu",
    "city of davao": "davao",
    "davao city": "davao",
    "sta. cruz": "santa cruz",
    "sta cruz": "santa cruz",
    "sta. maria": "santa maria",
    "sta maria": "santa maria",
    "sto. tomas": "santo tomas",
    "sto tomas": "santo tomas",
    "city of san jose del monte": "san jose del monte",
    "san jose del monte city": "san jose del monte",
  };

  return aliases[v] || v;
};

const makeKey = (city?: string, province?: string) =>
  `${normalizeMunicipality(city)}::${normalizeProvince(province)}`;

// Build the URL to the obituaries list, filtered by city/province.
// `condolenceMapSettings.obituariesUrl` can be localized from PHP (wp_localize_script)
// to point at the correct archive/page. Falls back to "/obituaries/".
// Strips an existing "City of X" / "X City" form down to the bare name,
// so we can consistently re-prefix it as "City of X" without duplicating "City".
const stripCityWording = (value: string) => {
  return value
    .trim()
    .replace(/^city of\s+/i, "")
    .replace(/\s+city$/i, "")
    .trim();
};

const buildObituariesUrl = (municipality: string) => {
  const base =
    (window as any).condolenceMapSettings?.obituariesUrl ||
    "/death-notices/";

  const params = new URLSearchParams({
    city: `City of ${stripCityWording(municipality)}`,
  });

  return `${base}${base.includes("?") ? "&" : "?"}${params.toString()}`;
};

const goToObituaries = (municipality: string) => {
  window.location.href = buildObituariesUrl(municipality);
};

function InitialMapView({
  mapRef,
}: {
  mapRef: React.MutableRefObject<LeafletMap | null>;
}) {
  const map = useMap();

  useEffect(() => {
    mapRef.current = map;

    map.setView(LUZON_CENTER, LUZON_ZOOM, {
      animate: false,
    });
  }, [map, mapRef]);

  return null;
}

export default function App({
  settings: {
    mapColor,
    hoverColor,
    mapBorderColor,
    zoomLevel,
    borderWeight,
    height,
  },
}: {
  settings: Settings;
}) {
  const [loading, startTransition] = useTransition();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  const mapRef = useRef<LeafletMap | null>(null);
  const searchRef = useRef<HTMLDivElement | null>(null);

  const noticeMap = useMemo(() => {
    return notices.reduce<Record<string, Notice>>((acc, item) => {
      acc[item.key] = item;
      return acc;
    }, {});
  }, [notices]);

  const searchablePlaces = useMemo<SearchItem[]>(() => {
    const seen = new Set<string>();

    return featureCollection.features
      .map((feature) => {
        const props = feature.properties || {};
        const municipality = String(props.NAME_2 || "").trim();
        const province = String(props.PROVINCE || "").trim();
        const region = String(props.REGION || "").trim();
        const key = makeKey(municipality, province);

        return {
          key,
          municipality,
          province,
          region,
          label: `${municipality}, ${province}`,
          searchText: `${municipality} ${province} ${region}`.toLowerCase(),
          feature,
        };
      })
      .filter((item) => {
        if (!item.municipality || !item.province) return false;
        if (seen.has(item.key)) return false;
        seen.add(item.key);
        return true;
      })
      .sort((a, b) => a.municipality.localeCompare(b.municipality));
  }, []);

  const filteredPlaces = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];

    return searchablePlaces
      .filter((item) => item.searchText.includes(q))
      .slice(0, 8);
  }, [search, searchablePlaces]);

  const resetMapView = () => {
    if (!mapRef.current) return;

    setSelectedKey(null);
    setSearch("");
    setSearchOpen(false);

    mapRef.current.setView(LUZON_CENTER, LUZON_ZOOM, {
      animate: true,
    });
  };

  const zoomToFeature = (
    feature: Feature<Geometry, MunicipalityProperties>,
    key?: string,
    label?: string,
  ) => {
    if (!mapRef.current) return;

    if (key) setSelectedKey(key);
    if (label) setSearch(label);
    setSearchOpen(false);

    const layer = L.geoJSON(feature);
    const bounds = layer.getBounds();

    if (bounds.isValid()) {
      mapRef.current.fitBounds(bounds, {
        padding: [24, 24],
        maxZoom: 10,
      });
    }
  };

  const getFeatureStyle = (
    feature?: Feature<Geometry, MunicipalityProperties>,
  ): PathOptions => {
    const props = feature?.properties || {};
    const key = makeKey(props.NAME_2, props.PROVINCE);
    const isSelected = selectedKey === key;

    return {
      color: mapBorderColor,
      weight: isSelected ? borderWeight + 1.25 : borderWeight,
      fillOpacity: 1,
      fillColor: isSelected ? hoverColor : mapColor,
    };
  };

  const onEachFeature = (
    feature: Feature<Geometry, MunicipalityProperties>,
    layer: Path,
  ) => {
    const props = feature.properties || {};
    const municipality = String(props.NAME_2 || "").trim();
    const province = String(props.PROVINCE || "").trim();
    const region = String(props.REGION || "").trim();
    const key = makeKey(municipality, province);

    const data = noticeMap[key] || {
      municipality,
      province,
      region,
      key,
      notice_week: 0,
      notice_total: 0,
      services: 0,
    };

    // Unique key used to identify this feature's polygon/tooltip.

    layer.on({
      mouseover: () => {
        if (selectedKey !== key) {
          layer.setStyle({
            fillColor: hoverColor,
            weight: borderWeight + 0.5,
          });
        }
      },
      mouseout: () => {
        if (selectedKey !== key) {
          layer.setStyle({
            fillColor: mapColor,
            weight: borderWeight,
          });
        }
      },
      click: () => {
        goToObituaries(municipality);
      },
    });

    layer.bindTooltip(
      `
      <div style="display:flex;flex-direction:column;gap:6px;width:220px;">
        <span style="font-size:14px;font-weight:600;color:#333;">${municipality}</span>
        <span style="font-size:12px;color:#777;">${province}</span>
        <span style="font-size:11px;color:#999;">${region}</span>
        <hr style="width:100%;border:0;border-top:1px solid #ccc;" />
        <div style="display:flex;flex-direction:column;gap:4px;">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <span style="font-size:13px;font-weight:500;color:#777;">Notices This Week</span>
            <span style="font-size:13px;font-weight:500;background-color:#555;color:#fff;min-width:30px;border-radius:4px;text-align:center;padding:1px 6px;">${data.notice_week}</span>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <span style="font-size:13px;font-weight:500;color:#777;">Total Notices</span>
            <span style="font-size:13px;font-weight:500;background-color:#555;color:#fff;min-width:30px;border-radius:4px;text-align:center;padding:1px 6px;">${data.notice_total}</span>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <span style="font-size:13px;font-weight:500;color:#777;">Funeral Homes</span>
            <span style="font-size:13px;font-weight:500;background-color:#555;color:#fff;min-width:30px;border-radius:4px;text-align:center;padding:1px 6px;">${data.services}</span>
          </div>
        </div>
      </div>
      `,
      {
        sticky: true,
        direction: "top",
        opacity: 1,
      },
    );
  };

  useEffect(() => {
    startTransition(async () => {
      const [obituariesRes, servicesRes] = await Promise.all([
        fetch(
          `${window.wpApiSettings.root}condolences/v1/obituaries-city`,
        ).then((res) => res.json()),
        fetch(`${window.wpApiSettings.root}condolences/v1/funeral-homes`).then(
          (res) => res.json(),
        ),
      ]);

      const resNotices: RawNotice[] = Array.isArray(obituariesRes)
        ? obituariesRes
        : [];

      const funeralHomes: FuneralHome[] = Array.isArray(
        servicesRes?.funeral_homes,
      )
        ? servicesRes.funeral_homes
        : [];

      const startOfWeek = moment.tz("Asia/Manila").startOf("isoWeek");
      const endOfWeek = moment.tz("Asia/Manila").endOf("isoWeek");

      const grouped: Record<string, Notice> = {};

      const ensureGroup = (
        municipality?: string,
        province?: string,
        region?: string,
      ) => {
        const cityName = String(municipality || "").trim();
        const provinceName = String(province || "").trim();

        if (!cityName || !provinceName) return null;

        const key = makeKey(cityName, provinceName);

        if (!grouped[key]) {
          grouped[key] = {
            municipality: cityName,
            province: provinceName,
            region,
            key,
            notice_week: 0,
            notice_total: 0,
            services: 0,
          };
        }

        return grouped[key];
      };

      for (const feature of featureCollection.features) {
        const props = feature.properties || {};
        ensureGroup(props.NAME_2, props.PROVINCE, props.REGION);
      }

      for (const row of resNotices) {
        const target = ensureGroup(row.city, row.province);
        if (!target) continue;

        target.notice_total += 1;

        const date = moment.tz(
          row.date_created,
          "MMM DD, YYYY",
          true,
          "Asia/Manila",
        );

        if (
          date.isValid() &&
          date.isBetween(startOfWeek, endOfWeek, undefined, "[]")
        ) {
          target.notice_week += 1;
        }
      }

      for (const service of funeralHomes) {
        const target = ensureGroup(service.city, service.province);
        if (!target) continue;

        target.services += 1;
      }

      setNotices(
        Object.values(grouped).sort((a, b) => {
          if (b.notice_total !== a.notice_total) {
            return b.notice_total - a.notice_total;
          }

          return a.municipality.localeCompare(b.municipality);
        }),
      );
    });
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!searchRef.current) return;
      if (!searchRef.current.contains(event.target as Node)) {
        setSearchOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  if (loading) {
    return (
      <div className="condolence-map-widget" style={{ minHeight: height }}>
        <div className="rounded-2xl border border-gray-300 bg-white p-4">
          <div className="condolence-map__toolbar condolence-map__toolbar--skeleton">
            <div className="condolence-map__search-wrap">
              <div className="condolence-map__skeleton condolence-map__skeleton-search" />
            </div>

            <div className="condolence-map__skeleton condolence-map__skeleton-button" />
          </div>

          <div className="condolence-map__map-skeleton">
            <div className="condolence-map__skeleton condolence-map__skeleton-map" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="condolence-map-widget" style={{ minHeight: height }}>
      <div className="rounded-2xl border border-gray-300 bg-white p-4">
        <div className="condolence-map__toolbar">
          <div className="condolence-map__search-wrap" ref={searchRef}>
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setSearchOpen(true);
              }}
              onFocus={() => setSearchOpen(true)}
              placeholder="Search municipality or city..."
              className="condolence-map__search-input"
            />

            {search && (
              <button
                type="button"
                className="condolence-map__search-clear"
                onClick={resetMapView}
              >
                ×
              </button>
            )}

            {searchOpen && filteredPlaces.length > 0 && (
              <div className="condolence-map__search-dropdown">
                {filteredPlaces.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    className="condolence-map__search-option"
                    onClick={() =>
                      zoomToFeature(item.feature, item.key, item.label)
                    }
                  >
                    <span className="condolence-map__search-option-main">
                      {item.municipality}
                    </span>
                    <span className="condolence-map__search-option-sub">
                      {item.province} · {item.region}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={resetMapView}
            className="condolence-map__reset"
          >
            Reset View
          </button>
        </div>

        <div className="relative h-[560px] w-full overflow-hidden rounded-xl border border-gray-200">
          <MapContainer
            className="h-full w-full"
            zoom={zoomLevel || 6}
            scrollWheelZoom={true}
            doubleClickZoom={true}
            touchZoom={true}
            keyboard={true}
            zoomControl={true}
            attributionControl={false}
            preferCanvas={true}
          >
            <TileLayer
              attribution="&copy; OpenStreetMap contributors"
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png"
              className="saturate-500"
            />

            <InitialMapView mapRef={mapRef} />

            <GeoJSON
              key={`${selectedKey}-${featureCollection.features.length}`}
              onEachFeature={onEachFeature}
              data={featureCollection}
              style={getFeatureStyle}
            />
          </MapContainer>
        </div>
      </div>
    </div>
  );
}