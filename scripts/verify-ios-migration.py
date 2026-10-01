# Run against an already built simulator .app; all fixtures use a disposable simulator.
import argparse, datetime, json, pathlib, plistlib, struct, subprocess, time, zlib
parser=argparse.ArgumentParser()
parser.add_argument('--app',required=True,help='Absolute path to the built simulator Cocktail60.app')
parser.add_argument('--runtime',default='com.apple.CoreSimulator.SimRuntime.iOS-27-0')
args=parser.parse_args()
DEVICE=subprocess.check_output(['xcrun','simctl','create','DDDrunk Migration Check','com.apple.CoreSimulator.SimDeviceType.iPhone-17e',args.runtime],text=True).strip()
APP='com.codex.cocktail60'
def sim(*args):
    return subprocess.check_output(['xcrun','simctl',*args],text=True).strip()
try:
    sim('boot',DEVICE)
    sim('bootstatus',DEVICE,'-b')
    sim('install',DEVICE,args.app)
    root=pathlib.Path(sim('get_app_container',DEVICE,APP,'data'))
    prefs=root/'Library/Preferences'/f'{APP}.plist'; prefs.parent.mkdir(parents=True,exist_ok=True)
    # A tiny generated PNG exercises UIKit decoding and JPEG conversion without external assets.
    def chunk(kind,data):
        return struct.pack('!I',len(data))+kind+data+struct.pack('!I',zlib.crc32(kind+data)&0xffffffff)
    photo=b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('!2I5B',8,8,8,2,0,0,0))+chunk(b'IDAT',zlib.compress((b'\0'+b'\xdc\xaa\x66'*8)*8))+chunk(b'IEND',b'')
    photo_path=root/'Documents/DrinkPhotos/migration-fixture.png'; photo_path.parent.mkdir(parents=True,exist_ok=True);photo_path.write_bytes(photo)
    thumb=root/'Documents/RecipeThumbnails/user-fixture.jpg';thumb.parent.mkdir(parents=True,exist_ok=True);thumb.write_bytes(photo)
    recipe={'id':'user-fixture','chineseName':'旧配方测试','englishName':'Legacy test','ingredients':['金酒 45 ml'],'tags':['金酒'],'glass':'马天尼杯','method':'摇和','note':'保留原文','accentHex':'#79a883','isUserCreated':True}
    days=[{'id':'day','date':datetime.datetime(2026,10,1,tzinfo=datetime.timezone.utc).timestamp()-978307200,'entries':[{'id':'legacy-entry','recipeID':'user-fixture','recipeName':'旧日记测试','recipeEnglishName':'Legacy journal','note':'八张照片全部保留','photoFilenames':['migration-fixture.png']*8}]}]
    state={'version':1,'inventory':[],'favorites':['vesper-style'],'customRecipes':[],'logs':[{'id':'web-entry','date':'2026-09-30','name':'网页记录','note':'保留网页数据'}],'taste':{'onboarding':None,'ratings':[]},'theme':'bar','locale':'zh-CN','migrated':False,'guideVersion':1}
    original={'dailyDrinkLogs':json.dumps(days,ensure_ascii=False).encode(),'userCocktailRecipes':json.dumps([recipe],ensure_ascii=False).encode(),'favoriteCocktailIDs':json.dumps(['user-fixture']).encode(),'myOwnedLiquors':['金酒'],'sharedBarStateV1':json.dumps(state,ensure_ascii=False)}
    prefs.write_bytes(plistlib.dumps(original))
    sim('launch',DEVICE,APP)
    for attempt in range(90):
        try:
            saved=plistlib.loads(prefs.read_bytes()); merged=json.loads(saved.get('sharedBarStateV1','{}'))
            if merged.get('nativeMigrationVersion')==1: break
        except (OSError,ValueError): pass
        time.sleep(.5)
    else: raise AssertionError('Native migration receipt did not reach UserDefaults')
    assert len(merged['logs'])==2,merged
    assert len(merged['customRecipes'])==1
    legacy=next(l for l in merged['logs'] if l['id']=='native-legacy-entry')
    assert len(legacy['photos'])==8
    assert legacy['date']=='2026-10-01',legacy['date']
    assert all(p.startswith('data:image/jpeg;base64,') for p in legacy['photos'])
    assert merged['customRecipes'][0]['photo'].startswith('data:image/jpeg;base64,')
    assert set(merged['favorites'])=={'vesper-style','user-fixture'}
    assert len(merged['inventory'])==1
    for field in ['dailyDrinkLogs','userCocktailRecipes','favoriteCocktailIDs','myOwnedLiquors']: assert saved[field]==original[field],field
    assert photo_path.read_bytes()==photo and thumb.read_bytes()==photo
    sim('terminate',DEVICE,APP);sim('launch',DEVICE,APP)
    time.sleep(3)
    again=json.loads(plistlib.loads(prefs.read_bytes())['sharedBarStateV1'])
    assert len(again['logs'])==2 and len(again['customRecipes'])==1
    print('PASS: Swift -> WebKit -> UserDefaults migration; 8 diary photos, recipe thumbnail, favorites, inventory, originals and restart idempotency')
    pathlib.Path('output').mkdir(exist_ok=True)
    pathlib.Path('output/ios-migration-result.json').write_text(json.dumps({'passed':True,'logs':2,'diaryPhotos':8,'recipes':1,'originalsPreserved':True,'restartIdempotent':True},indent=2))
finally:
    subprocess.run(['xcrun','simctl','shutdown',DEVICE],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    subprocess.run(['xcrun','simctl','delete',DEVICE],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
