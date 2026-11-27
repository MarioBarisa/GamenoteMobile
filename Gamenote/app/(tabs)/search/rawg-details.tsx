import {screenContent} from "@/constants/layout";
import {ScreenScrollView, ScreenViewport} from "@/components/ScreenViewport";
import ScreenshotCarousel from "@/components/ScreenshotCarousel";
import {useGamePresentation} from "@/context/localMode";
import {getIgdbGame, getIgdbSeries} from "@/services/igdbApi";
import {useEffect, useState} from "react";
import {useLocalSearchParams, Stack, useRouter, useSegments} from "expo-router";
import {Image} from "expo-image";
import {ActivityIndicator, StyleSheet, Text, View, Pressable} from "react-native";
import ImageGallery from "@/components/ImageGallery";
import {useTheme} from "@/context/theme";
import {SymbolView} from "expo-symbols";
import {useTranslation} from "react-i18next";
import {Game} from "@/common/Game";
import {SeriesGame} from "@/common/GameSeries";
import {getGameDetails, getGameScreenshots, getGameSeries} from "@/services/gamesApi";
import {useUserGames} from "@/hooks/useUserGames";

function parseSeries(raw: any[]): SeriesGame[] | undefined {
  if (!raw || !Array.isArray(raw)) return undefined;
  return raw.map((item: any) => ({
    id: item.id,
    name: item.name,
    released: item.released ?? null,
    background_image: item.background_image ?? '',
  }));
}

function getPrequelAndSequel(series: SeriesGame[], currentReleaseDate: string): { prequel?: SeriesGame; sequel?: SeriesGame } {
  const sorted = [...series].sort((a, b) => {
    if (!a.released) return 1;
    if (!b.released) return -1;
    return new Date(a.released).getTime() - new Date(b.released).getTime();
  });

  const currentIndex = sorted.findIndex(s => s.released === currentReleaseDate);

  if (currentIndex === -1) {
    if (!currentReleaseDate) return {};
    const currentDate = new Date(currentReleaseDate).getTime();
    let closestBefore: SeriesGame | undefined;
    let closestAfter: SeriesGame | undefined;
    let minBeforeDiff = Infinity;
    let minAfterDiff = Infinity;

    for (const s of sorted) {
      if (!s.released) continue;
      const diff = new Date(s.released).getTime() - currentDate;
      if (diff < 0 && Math.abs(diff) < minBeforeDiff) {
        minBeforeDiff = Math.abs(diff);
        closestBefore = s;
      } else if (diff > 0 && diff < minAfterDiff) {
        minAfterDiff = diff;
        closestAfter = s;
      }
    }
    return { prequel: closestBefore, sequel: closestAfter };
  }

  return {
    prequel: currentIndex > 0 ? sorted[currentIndex - 1] : undefined,
    sequel: currentIndex < sorted.length - 1 ? sorted[currentIndex + 1] : undefined,
  };
}

export default function RAWGDetailsScreen() {
  const {t: tr} = useTranslation();
  const {theme, themeColors: t} = useTheme();
  const {game: rawgParam} = useLocalSearchParams<{ game: string }>();
  const router = useRouter();
  const {games: userGames} = useUserGames();
  const {isLocal, imageUrl} = useGamePresentation();
  const segments = useSegments();
  const tab = segments[1] as 'home' | 'favorites' | 'search';

  const rawgData: any = (() => {
    try {
      return rawgParam ? JSON.parse(rawgParam) : null;
    } catch {
      return null;
    }
  })();

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [enrichedData, setEnrichedData] = useState<any>(null);
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [seriesData, setSeriesData] = useState<SeriesGame[] | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(!isLocal && !!rawgData?.id);
  const [detailAttempt, setDetailAttempt] = useState(0);
  const [igdbDetails, setIgdbDetails] = useState<{
    id: string; attempt: number; game: Awaited<ReturnType<typeof getIgdbGame>>;
  }>();
  const id = String(rawgData?.id ?? "");
  const hasDetails = typeof rawgData?.description_raw === "string";
  const fromIgdb = id.startsWith("igdb-");
  const needsLocalDetails = isLocal && !hasDetails;
  const detailResult = igdbDetails?.id === id && igdbDetails.attempt === detailAttempt ? igdbDetails : undefined;
  const loadingLocalDetails = needsLocalDetails && fromIgdb && !detailResult;
  const unavailableLocalDetails = needsLocalDetails && !loadingLocalDetails && !detailResult?.game;

  useEffect(() => {
    if (!needsLocalDetails || !fromIgdb) return;
    const controller = new AbortController();
    const complete = (game: Awaited<ReturnType<typeof getIgdbGame>>) => {
      if (!controller.signal.aborted) setIgdbDetails({id, attempt: detailAttempt, game});
    };
    getIgdbGame(id, controller.signal).then(complete, () => complete(null));
    return () => controller.abort();
  }, [detailAttempt, fromIgdb, id, needsLocalDetails]);

  useEffect(() => {
    if (!id) return;
    if (isLocal) {
      const controller = new AbortController();
      getIgdbSeries(id, controller.signal).then(series => {
        if (!controller.signal.aborted) setSeriesData(series);
      }).catch(() => {});
      return () => controller.abort();
    }

    let cancelled = false;

    const fetchAll = async () => {
      const [details, shots, series] = await Promise.all([
        getGameDetails(id),
        getGameScreenshots(id),
        getGameSeries(id),
      ]);

      if (cancelled) return;

      if (details) {
        setEnrichedData(details);
      } else {
        setEnrichedData(null);
      }

      const screenshotUris = (shots ?? [])
        .map((s: any) => s.image)
        .filter(Boolean);
      setScreenshots(screenshotUris);

      const seriesGames = parseSeries(series?.results);
      setSeriesData(seriesGames);

      setIsLoading(false);
    };

    fetchAll();
    return () => { cancelled = true; };
  }, [id, isLocal]);

  if (!rawgData) {
    return (
        <ScreenViewport backgroundColor={t.background}>
            <Text style={{color: t.text, padding: 16}}>{tr('gameDetails.notFound')}</Text>
        </ScreenViewport>
    );
  }

  const data = (isLocal ? detailResult?.game : enrichedData) ?? rawgData;
  const ownedGame = userGames.find(g => g.game_id === String(rawgData.id));

  const navigateToReferencedGame = (seriesItem: SeriesGame) => {
    const seriesId = isLocal && id.startsWith("igdb-") ? `igdb-${seriesItem.id}` : String(seriesItem.id);
    const matched = userGames.find(g => g.game_id === seriesId);
    if (matched) {
      router.push({
        pathname: `/(tabs)/${tab}/details`,
        params: {game: JSON.stringify(matched)},
      });
    } else {
      router.push({
        pathname: '/(tabs)/search/rawg-details',
        params: {game: JSON.stringify({id: seriesId, name: seriesItem.name, background_image: seriesItem.background_image})},
      });
    }
  };

  const localScreenshots = isLocal ? (data.short_screenshots ?? []).flatMap((shot: {image: string}) => imageUrl(shot.image) || []) as string[] : [];
  const gameScreenshots = isLocal ? localScreenshots : screenshots;
  const {prequel, sequel} = getPrequelAndSequel(seriesData ?? [], data.released ?? '');
  const score = fromIgdb ? data.igdb_rating ?? 0 : data.metacritic ?? rawgData.metacritic ?? 0;

  const game: Partial<Game> = {
    title: data.name ?? rawgData.name ?? '',
    game_id: String(rawgData.id ?? ''),
    image_url: data.background_image ?? rawgData.background_image ?? undefined,
    background_image: data.background_image_additional ?? rawgData.background_image_additional ?? undefined,
    screenshot_urls: gameScreenshots.length > 0 ? gameScreenshots : undefined,
    genre: data.genres?.map((g: any) => g.name).join(', ') ?? rawgData.genres?.map((g: any) => g.name).join(', ') ?? undefined,
    publisher: data.publishers?.[0]?.name ?? rawgData.publishers?.[0]?.name ?? undefined,
    releaseDate: data.released ?? rawgData.released ?? '',
    metacriticScore: score,
    about: data.description_raw ?? data.description ?? '',
    webPage: data.website ?? '',
    esrbRating: data.esrb_rating?.name ?? rawgData.esrb_rating?.name ?? undefined,
    series: seriesData,
  };

  const galleryImages: string[] = (() => {
    const urls: string[] = [];
    if (gameScreenshots.length > 0) {
      urls.push(...gameScreenshots);
    } else if (rawgData.background_image) {
      urls.push(rawgData.background_image);
      if (rawgData.short_screenshots && Array.isArray(rawgData.short_screenshots)) {
        rawgData.short_screenshots.forEach((ss: any) => {
          if (ss.image) urls.push(ss.image);
        });
      }
    }
    return [...new Set(urls.flatMap(url => imageUrl(url) || []))];
  })();

  const scoreColor = (() => {
    const clamped = Math.max(0, Math.min(score, 100));
    if (clamped >= 90) return '#00CE7A';
    if (clamped >= 75) return '#66CC33';
    if (clamped >= 50) return '#FFCC33';
    return '#FF0000';
  })();

  const platforms = data.platforms
    ?.map((p: any) => p.platform?.name)
    .filter(Boolean)
    .join(', ') ?? rawgData.platforms
    ?.map((p: any) => p.platform?.name)
    .filter(Boolean)
    .join(', ') ?? 'N/A';

  const esrbRating = data.esrb_rating?.name ?? rawgData.esrb_rating?.name ?? 'N/A';

  return (
    <>
      <Stack.Screen
        options={{
          title: game.title,
          headerBackTitle: tr("common.back"),
        }}
      />
      <ScreenScrollView contentContainerStyle={[screenContent.detail, {gap: 10, padding: 8}]}
                  backgroundColor={t.background}
                  automaticallyAdjustContentInsets={true}>
        <View style={[styles.card, {
          backgroundColor: t.card,
          borderColor: theme === 'dark' ? '#2C2C2E' : '#E5E5EA',
        }]}>
          {isLoading || loadingLocalDetails ? (
            <View style={{padding: 32, alignItems: 'center'}}>
              <ActivityIndicator size="large" color={t.accent}/>
            </View>
          ) : (
            <>
              <ScreenshotCarousel images={galleryImages} isLocal={isLocal} onOpen={setSelectedIndex}/>

              {ownedGame ? (
                <Pressable
                  onPress={() => router.push({
                    pathname: `/(tabs)/${tab}/details`,
                    params: {game: JSON.stringify(ownedGame)},
                  })}
                  style={[styles.addButton, {backgroundColor: '#4cd964', margin: 12}]}
                >
                  <SymbolView name="eye.fill" style={{width: 20, height: 20}} tintColor="#fff"/>
                  <Text style={{color: '#fff', fontWeight: '700', fontSize: 16}}>
                    {tr('search.viewInLibrary')}
                  </Text>
                </Pressable>
              ) : unavailableLocalDetails ? (
                <View style={{padding: 16, gap: 8}}>
                  <Text accessibilityRole="alert" style={{color: t.secondaryText}}>
                    {tr(fromIgdb ? "screens.localMode.igdbDetailsError" : "gameDetails.notFound")}
                  </Text>
                  {fromIgdb && <Pressable accessibilityRole="button"
                    onPress={() => setDetailAttempt(attempt => attempt + 1)}
                    style={[styles.addButton, {backgroundColor: t.accent}]}>
                    <Text style={{color: "#fff", fontWeight: "700"}}>{tr("screens.localMode.retry")}</Text>
                  </Pressable>}
                </View>
              ) : (
                <Pressable
                  onPress={() => router.push({
                    pathname: '/(modals)/addGameModal',
                    params: {game: JSON.stringify(game)},
                  })}
                  style={[styles.addButton, {backgroundColor: t.accent, margin: 12}]}
                >
                  <SymbolView name="plus" style={{width: 20, height: 20}} tintColor="#fff"/>
                  <Text style={{color: '#fff', fontWeight: '700', fontSize: 16}}>
                    {tr('addGame.title')}
                  </Text>
                </Pressable>
              )}

              {ownedGame ? (
                <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 4}}>
                  <SymbolView name="checkmark.circle.fill" style={{width: 18, height: 18}} tintColor="#4cd964"/>
                  <Text style={{color: '#4cd964', fontSize: 14, fontWeight: '700'}}>
                    {tr('search.inLibrary')}
                  </Text>
                </View>
              ) : null}
              <View style={{padding: 16, gap: 12}}>
                {platforms !== 'N/A' && (
                  <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                    <Text style={{color: t.secondaryText, fontSize: 14}}>Platforms</Text>
                    <Text style={{color: t.text, fontSize: 14, fontWeight: '600', textAlign: 'right', flex: 1}}>{platforms}</Text>
                  </View>
                )}

                {game.genre ? (
                  <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                    <Text style={{color: t.secondaryText, fontSize: 14}}>{tr("gameDetails.genre")}</Text>
                    <Text style={{color: t.text, fontSize: 14, fontWeight: '600'}}>{game.genre}</Text>
                  </View>
                ) : null}

                {game.publisher ? (
                  <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                    <Text style={{color: t.secondaryText, fontSize: 14}}>{tr("gameDetails.developer")}</Text>
                    <Text style={{color: t.text, fontSize: 14, fontWeight: '600'}}>{game.publisher}</Text>
                  </View>
                ) : null}

                {game.releaseDate ? (
                  <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                    <Text style={{color: t.secondaryText, fontSize: 14}}>{tr("gameDetails.releaseYear")}</Text>
                    <Text style={{color: t.text, fontSize: 14, fontWeight: '600'}}>{game.releaseDate}</Text>
                  </View>
                ) : null}

                <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                  <Text style={{color: t.secondaryText, fontSize: 14}}>
                    {tr(fromIgdb ? "gameDetails.igdbScore" : "gameDetails.metacritic")}
                  </Text>
                  {score ? (
                    <View style={{
                      backgroundColor: scoreColor,
                      width: 36,
                      height: 36,
                      borderRadius: 4,
                      justifyContent: 'center',
                      alignItems: 'center',
                      borderColor: 'rgba(0,0,0,0.1)',
                    }}>
                      <Text style={{color: '#FFFFFF', fontSize: 16, fontWeight: 'bold'}}>
                        {score}
                      </Text>
                    </View>
                  ) : (
                    <Text style={{color: t.secondaryText, fontSize: 14, fontWeight: '500'}}>N/A</Text>
                  )}
                </View>

                <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                  <Text style={{color: t.secondaryText, fontSize: 14}}>ESRB</Text>
                  <Text style={{color: t.text, fontSize: 14, fontWeight: '600'}}>{esrbRating}</Text>
                </View>

                {game.about ? (
                  <View style={{gap: 4, marginTop: 4}}>
                    <Text style={{color: t.secondaryText, fontSize: 14}}>{tr("gameDetails.descriptionSection")}</Text>
                    <Text style={{color: t.text, fontSize: 14, lineHeight: 20}}>{game.about}</Text>
                  </View>
                ) : null}

                {seriesData && seriesData.length > 0 ? (
                  <View style={{gap: 8, marginTop: 8}}>
                    <Text style={{color: t.secondaryText, fontSize: 14, marginBottom: 4}}>
                      {tr("gameDetails.seriesSection")}
                    </Text>
                    {prequel ? (() => {
                      const year = prequel.released ? prequel.released.split('-')[0] : '';
                      return (
                        <Pressable
                          key={`prequel-${prequel.id}`}
                          onPress={() => navigateToReferencedGame(prequel)}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 12,
                            backgroundColor: theme === 'dark' ? '#2C2C2E' : '#F2F2F7',
                            padding: 8,
                            borderRadius: 8,
                          }}
                        >
                          <Image
                            source={{uri: imageUrl(prequel.background_image)}}
                            style={{width: 100, aspectRatio: 10 / 7, borderRadius: 4}}
                            contentFit="cover"
                            cachePolicy={isLocal ? "memory" : "memory-disk"}
                            transition={{duration: 200, effect: "cross-dissolve"}}
                          />
                          <View style={{flex: 1}}>
                            <Text
                              style={{color: t.text, fontSize: 14, fontWeight: '600'}}
                              numberOfLines={1}
                            >
                              {prequel.name}
                            </Text>
                            {year ? (
                              <Text style={{color: t.secondaryText, fontSize: 12}}>
                                {year}.
                              </Text>
                            ) : null}
                          </View>
                        </Pressable>
                      );
                    })() : (
                      <Text style={{color: t.secondaryText, fontSize: 13, fontStyle: 'italic'}}>
                        {tr("gameDetails.noPrequel")}
                      </Text>
                    )}
                    {sequel ? (() => {
                      const year = sequel.released ? sequel.released.split('-')[0] : '';
                      return (
                        <Pressable
                          key={`sequel-${sequel.id}`}
                          onPress={() => navigateToReferencedGame(sequel)}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 12,
                            backgroundColor: theme === 'dark' ? '#2C2C2E' : '#F2F2F7',
                            padding: 8,
                            borderRadius: 8,
                          }}
                        >
                          <Image
                            source={{uri: imageUrl(sequel.background_image)}}
                            style={{width: 100, aspectRatio: 10 / 7, borderRadius: 4}}
                            contentFit="cover"
                            cachePolicy={isLocal ? "memory" : "memory-disk"}
                            transition={{duration: 200, effect: "cross-dissolve"}}
                          />
                          <View style={{flex: 1}}>
                            <Text
                              style={{color: t.text, fontSize: 14, fontWeight: '600'}}
                              numberOfLines={1}
                            >
                              {sequel.name}
                            </Text>
                            {year ? (
                              <Text style={{color: t.secondaryText, fontSize: 12}}>
                                {year}.
                              </Text>
                            ) : null}
                          </View>
                        </Pressable>
                      );
                    })() : (
                      <Text style={{color: t.secondaryText, fontSize: 13, fontStyle: 'italic'}}>
                        {tr("gameDetails.noSequel")}
                      </Text>
                    )}
                  </View>
                ) : null}
              </View>
            </>
          )}
        </View>
      </ScreenScrollView>

      {selectedIndex !== null && (
          <ImageGallery
              images={galleryImages}
              initialIndex={selectedIndex}
              onClose={() => setSelectedIndex(null)}
          />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: {width: 0, height: 3},
    elevation: 2,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 24,
  },
});
