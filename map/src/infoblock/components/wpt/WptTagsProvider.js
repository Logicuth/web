import i18n from '../../../i18n';
import { ReactComponent as TimeIcon } from '../../../assets/icons/ic_action_time.svg';
import { ReactComponent as CallIcon } from '../../../assets/icons/ic_action_call_dark.svg';
import { ReactComponent as PhoneIcon } from '../../../assets/icons/ic_action_phone.svg';
import { ReactComponent as WebsiteIcon } from '../../../assets/icons/ic_world_globe_dark.svg';
import { ReactComponent as WikipediaIcon } from '../../../assets/icons/ic_plugin_wikipedia.svg';
import { ReactComponent as PoiNameIcon } from '../../../assets/icons/ic_action_poi_name.svg';
import { ReactComponent as BrandIcon } from '../../../assets/icons/ic_action_poi_brand.svg';
import { ReactComponent as InternetIcon } from '../../../assets/icons/ic_action_internet_access_fee.svg';
import { ReactComponent as InfoIcon } from '../../../assets/icons/ic_action_info_dark.svg';
import { ReactComponent as InstagramIcon } from '../../../assets/icons/ic_action_social_instagram.svg';
import { ReactComponent as CuisineIcon } from '../../../assets/icons/ic_action_cuisine.svg';
import * as locales from 'date-fns/locale';
import { format, startOfWeek, addDays } from 'date-fns';

const WIKIPEDIA = 'wikipedia';
const OSM_WIKI = 'osmwiki';
const AMENITY_PREFIX = 'amenity_';
const TYPE = 'type';
const SUBTYPE = 'subtype';
const SERVICE_TIMES = 'service_times';
const COLLECTION_TIMES = 'collection_times';
export const OPENING_HOURS = 'opening_hours';
const PHONE = 'phone';
const MOBILE = 'mobile';
const WEBSITE = 'website';
const CUISINE = 'cuisine';
const ROUTE = 'route';
const WIKIDATA = 'wikidata';
const WIKIMEDIA_COMMONS = 'wikimedia_commons';
const OSM_PREFIX = 'osm_tag_';
export const POI_PREFIX = 'poi_';
const COLLAPSABLE_PREFIX = 'collapsable_';
const HIDDEN_EXTENSIONS = 'hidden_extensions';
export const SEPARATOR = ';';

function getWptTags(wpt, type) {
    let tags;
    let res = [];
    let typeTag = null;
    let subtypeTag = null;
    if (type.isFav) {
        tags = wpt.ext?.extensions;
    }

    if (tags) {
        typeTag = tags[AMENITY_PREFIX + TYPE];
        subtypeTag = tags[AMENITY_PREFIX + SUBTYPE];
        let isWikipediaLink = false;
        let hasCuisine = false;

        tags = fixTagsKeys(tags);

        Object.entries(tags).forEach(([key, value]) => {
            if (!shouldSkipKey(key)) {
                let tagObj = {};
                tagObj.key = key;
                tagObj.value = value;
                tagObj.needLinks = ![OPENING_HOURS, 'population', 'height'].includes(key);
                tagObj.isUrl = isUrl(value);

                if (!tagObj.isUrl && tagObj.needLinks) {
                    tagObj.hiddenUrl = getSocialMediaUrl(key, value);
                    if (tagObj.hiddenUrl != null) {
                        tagObj.isUrl = true;
                    }
                } else if (key.includes(WIKIPEDIA)) {
                    tagObj = addWikipediaTags(key, value, tagObj);
                }

                if (typeTag === OSM_WIKI) {
                    // add wiki content
                } else {
                    switch (key) {
                        case CUISINE:
                            tagObj.icon = <CuisineIcon />;
                            break;
                        case SERVICE_TIMES:
                        case COLLECTION_TIMES:
                            tagObj.icon = <TimeIcon />;
                            tagObj.needLinks = false;
                            tagObj.textPrefix = value;
                            break;
                        case OPENING_HOURS:
                            tagObj.icon = <TimeIcon />;
                            tagObj.textPrefix = localizeWeekDays(value);
                            break;
                        case PHONE:
                            tagObj.icon = <CallIcon />;
                            tagObj.isPhoneNumber = true;
                            break;
                        case MOBILE:
                            tagObj.icon = <PhoneIcon />;
                            tagObj.isPhoneNumber = true;
                            break;
                        case WEBSITE:
                            tagObj.icon = <WebsiteIcon />;
                            tagObj.isUrl = true;
                            break;
                        default:
                            if (isWikipediaLink) {
                                tagObj.icon = <WikipediaIcon />;
                            } else if (key === 'addr:housename' || key === 'whitewater:rapid_name') {
                                tagObj.icon = <PoiNameIcon />;
                            } else if (key === 'operator' || key === 'brand') {
                                tagObj.icon = <BrandIcon />;
                            } else if (key === 'internet_access_fee_yes') {
                                tagObj.icon = <InternetIcon />;
                            } else if (key === 'instagram') {
                                tagObj.icon = <InstagramIcon />;
                            } else {
                                tagObj.icon = <InfoIcon />;
                            }
                    }
                }

                const formattedPrefixAndText = getFormattedPrefixAndText(key, tagObj.textPrefix, value, subtypeTag);
                tagObj.textPrefix = formattedPrefixAndText[0];
                tagObj.value = formattedPrefixAndText[1];

                if (key.startsWith(COLLAPSABLE_PREFIX)) {
                    tagObj.collapsable = true;
                    tagObj.textPrefix = key.replace(COLLAPSABLE_PREFIX, '');
                    if (tagObj.textPrefix === CUISINE) {
                        tagObj.icon = <CuisineIcon />;
                        hasCuisine = true;
                    }
                }

                // add ele tag

                res.push(tagObj);
            }
        });
        if (hasCuisine) {
            res = res.filter((t) => t.key !== CUISINE);
        }
    }

    return { res: res, type: typeTag, subtype: subtypeTag };
}

function localizeWeekDays(schedule) {
    const locale = locales[i18n.language] || locales.enUS;
    const baseDate = startOfWeek(new Date(), { weekStartsOn: 1 });

    const days = {
        Mo: format(baseDate, 'eee', { locale }),
        Tu: format(addDays(baseDate, 1), 'eee', { locale }),
        We: format(addDays(baseDate, 2), 'eee', { locale }),
        Th: format(addDays(baseDate, 3), 'eee', { locale }),
        Fr: format(addDays(baseDate, 4), 'eee', { locale }),
        Sa: format(addDays(baseDate, 5), 'eee', { locale }),
        Su: format(addDays(baseDate, 6), 'eee', { locale }),
    };

    return schedule.replace(/\b(Mo|Tu|We|Th|Fr|Sa|Su)\b/g, (match) => days[match]);
}

function fixTagsKeys(tags) {
    let res = {};
    for (const [key, value] of Object.entries(tags)) {
        let newKey = key;
        if (key === AMENITY_PREFIX + OPENING_HOURS) {
            newKey = key.replace(AMENITY_PREFIX, '');
        } else if (key.startsWith(AMENITY_PREFIX) || HIDDEN_EXTENSIONS.includes(key)) {
            continue;
        } else {
            newKey = key.replace(OSM_PREFIX, '');
        }
        res[newKey] = value;
    }
    return res;
}

function getFormattedPrefixAndText(key, prefix, value, subtype) {
    let formattedValue = value;
    let formattedPrefix = prefix;

    switch (key) {
        case 'width':
            formattedPrefix = i18n?.t('width');
            break;
        case 'height':
            formattedPrefix = i18n?.t('height');
            break;
        case 'depth':
        case 'seamark_height':
            formattedValue = `${value} ${i18n?.t('meter')}`;
            break;
        case 'distance':
            formattedValue = `${value} ${i18n?.t('km')}`;
            formattedPrefix = `${prefix} ${i18n?.t('distance')}`;
            break;
        case 'capacity':
            if (subtype === 'water_tower' || subtype === 'storage_tank') {
                formattedValue = `${value} ${i18n?.t('cubic_m')}`;
            }
            break;
        case 'maxweight':
            if (isInt(value)) {
                formattedValue = `${value} ${i18n?.t('metric_ton')}`;
            }
            break;
        case 'students':
        case 'spots':
        case 'seats':
            if (isInt(value)) {
                formattedPrefix = `${prefix} ${i18n?.t('capacity')}`;
            }
            break;
        case 'wikipedia':
            formattedPrefix = i18n?.t('wikipedia');
            break;
    }
    return [formattedPrefix, formattedValue];
}

function isInt(n) {
    return !isNaN(parseInt(n)) && parseFloat(n) === parseInt(n);
}

function getSocialMediaUrl(key, value) {
    // Remove leading and closing slashes
    let trimmedValue = value.trim();
    if (trimmedValue.charAt(0) === '/') {
        trimmedValue = trimmedValue.substring(1);
    }
    if (trimmedValue.charAt(trimmedValue.length - 1) === '/') {
        trimmedValue = trimmedValue.substring(0, trimmedValue.length - 1);
    }

    // It cannot be username
    if (isUrl(trimmedValue)) {
        return 'https://' + trimmedValue;
    }

    const urls = {
        facebook: 'https://facebook.com/%s',
        vk: 'https://vk.com/%s',
        instagram: 'https://instagram.com/%s',
        twitter: 'https://twitter.com/%s',
        ok: 'https://ok.ru/%s',
        telegram: 'https://t.me/%s',
        flickr: 'https://flickr.com/%s',
    };

    if (Object.prototype.hasOwnProperty.call(urls, key)) {
        return urls[key].replace('%s', trimmedValue);
    } else {
        return null;
    }
}

function addWikipediaTags(key, value, tagObj) {
    let wikiParams = getWikiParams(key, value);
    tagObj.value = wikiParams.text;
    tagObj.hiddenUrl = wikiParams.url;
    tagObj.isWikipediaLink = tagObj.isUrl = true;

    return tagObj;
}

function getWikiParams(key, value) {
    let title = null;
    let langCode = 'en';
    // Full OpenStreetMap Wikipedia tag pattern looks like "operator:wikipedia:lang_code",
    // "operator" and "lang_code" is optional parameters and may be skipped.
    if (key.includes(':')) {
        let tagParts = key.split(':');
        if (tagParts.length === 3) {
            // In this case tag contains all 3 parameters: "operator", "wikipedia" and "lang_code".
            langCode = tagParts[2];
        } else if (tagParts.length === 2) {
            // In this case one of the optional parameters was skipped.
            // Parameters never change their order and parameter "wikipedia" is always present.
            if (tagParts[0] === 'wikipedia') {
                // So if "wikipedia" is the first parameter, then parameter "operator" was skipped.
                // And the second parameter is "lang_code".
                langCode = tagParts[1];
            }
        }
    }
    // Value of an Wikipedia item can be an URL, but it is not recommended.
    // OSM users should use the following pattern "lang_code:article_title" instead.
    // Where "lang_code" is optional parameter for multilingual wikipedia tags.
    let url;
    if (isUrl(value)) {
        // In this case a value is already represented as an URL.
        url = value;
    } else {
        if (value.includes(':')) {
            // If value contains a sign ":" it means that "lang_code" is also present in value.
            let valueParts = value.split(':');
            langCode = valueParts[0];
            title = valueParts[1];
        } else {
            title = value;
        }
        // Full article URL has a pattern: "http://lang_code.wikipedia.org/wiki/article_name"
        let formattedTitle = title.replace(/ /g, '_');
        url = 'http://' + langCode + '.wikipedia.org/wiki/' + formattedTitle;
    }
    let text = title !== null ? title : value;
    return { text, url };
}

function isUrl(value) {
    try {
        new URL(value);
        return true;
    } catch (_) {
        return false;
    }
}

function shouldSkipKey(key) {
    return (
        key === 'image' ||
        key === 'mapillary' ||
        key === 'subway_region' ||
        key === 'note' ||
        key === 'lang_yes' ||
        key === WIKIDATA ||
        key === WIKIMEDIA_COMMONS ||
        key.startsWith('name:') ||
        key.includes(ROUTE)
    );
}

const WptTagsProvider = {
    getWptTags,
};
export default WptTagsProvider;
