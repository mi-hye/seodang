import {expect} from '@playwright/test';
export async function chooseAudioRate(page,trigger,value){
 await trigger.click();
 const sheet=page.locator('.audio-rate-sheet');await expect(sheet).toBeVisible();
 await expect(sheet.locator('[data-rate-choice]')).toHaveCount(8);
 await sheet.locator(`[data-rate-choice="${value}"]`).click();
 await expect(sheet).toHaveCount(0);await expect(trigger).toHaveAttribute('data-audio-rate',String(value));
}
